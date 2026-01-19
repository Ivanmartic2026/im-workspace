import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId, startDate, endDate } = await req.json();

    // Hämta fordonsinformation
    const vehicle = await base44.asServiceRole.entities.Vehicle.filter({ id: vehicleId });
    if (!vehicle || vehicle.length === 0) {
      return Response.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicleData = vehicle[0];
    if (!vehicleData.gps_device_id) {
      return Response.json({ error: 'No GPS device ID configured for this vehicle' }, { status: 400 });
    }

    // Hämta resor från GPS-systemet
    const gpsResponse = await base44.asServiceRole.functions.invoke('gpsTracking', {
      action: 'getTrips',
      params: {
        deviceId: vehicleData.gps_device_id,
        begintime: Math.floor(new Date(startDate).getTime() / 1000),
        endtime: Math.floor(new Date(endDate).getTime() / 1000)
      }
    });

    if (!gpsResponse.data || gpsResponse.data.status !== 0) {
      return Response.json({ 
        error: 'Failed to fetch GPS trips',
        details: gpsResponse.data 
      }, { status: 500 });
    }

    const trips = gpsResponse.data.totaltrips || [];
    const syncedTrips = [];
    const skippedTrips = [];

    // Försök att hitta förare baserat på fordonstilldelning
    let defaultDriver = null;
    if (vehicleData.assigned_driver) {
      try {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const driver = allUsers.find(u => u.email === vehicleData.assigned_driver);
        if (driver) {
          defaultDriver = driver;
        }
      } catch (e) {
        console.log('Could not fetch users:', e.message);
      }
    }

    for (const trip of trips) {
      // Kontrollera om resan redan finns i körjournalen (kolla både gps_trip_id och tidsmatchning)
      const tripStartTime = new Date(trip.begintime * 1000).toISOString();
      
      const existing = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
        vehicle_id: vehicleId
      });

      const matchingEntry = existing.find(e => {
        if (e.gps_trip_id === trip.tripid?.toString()) return true;
        // Kolla tidsmatchning (inom 5 minuter)
        const entryStart = new Date(e.start_time).getTime();
        const tripStart = trip.begintime * 1000;
        return Math.abs(entryStart - tripStart) < 5 * 60 * 1000;
      });

      if (matchingEntry) {
        // Uppdatera befintlig post med GPS-data om den saknas
        if (!matchingEntry.gps_trip_id) {
          await base44.asServiceRole.entities.DrivingJournalEntry.update(matchingEntry.id, {
            gps_trip_id: trip.tripid?.toString()
          });
        }
        skippedTrips.push({ tripId: trip.tripid, reason: 'Already exists or matched' });
        continue;
      }

      // Flagga om förare saknas
      let anomalyFlag = false;
      let anomalyReason = '';
      
      if (!defaultDriver) {
        anomalyFlag = true;
        anomalyReason = 'Förare kunde inte identifieras automatiskt';
      }

      // Skapa ny körjournalspost
      const journalEntry = {
        vehicle_id: vehicleId,
        registration_number: vehicleData.registration_number,
        gps_trip_id: trip.tripid?.toString(),
        start_time: new Date(trip.begintime * 1000).toISOString(),
        end_time: new Date(trip.endtime * 1000).toISOString(),
        distance_km: parseFloat((trip.mileage || 0).toFixed(2)),
        duration_minutes: Math.round((trip.endtime - trip.begintime) / 60),
        trip_type: 'väntar',
        status: 'pending_review',
        is_anomaly: anomalyFlag,
        anomaly_reason: anomalyReason || null
      };

      // Lägg till förarinfo om tillgänglig
      if (defaultDriver) {
        journalEntry.driver_email = defaultDriver.email;
        journalEntry.driver_name = defaultDriver.full_name;
      }

      // Lägg till startplats om tillgänglig
      if (trip.beginlocation) {
        journalEntry.start_location = {
          latitude: trip.beginlocation.latitude,
          longitude: trip.beginlocation.longitude,
          address: trip.beginlocation.address || `${trip.beginlocation.latitude}, ${trip.beginlocation.longitude}`
        };
      }

      // Lägg till slutplats om tillgänglig
      if (trip.endlocation) {
        journalEntry.end_location = {
          latitude: trip.endlocation.latitude,
          longitude: trip.endlocation.longitude,
          address: trip.endlocation.address || `${trip.endlocation.latitude}, ${trip.endlocation.longitude}`
        };
      }

      // Flagga ytterligare avvikelser
      if (journalEntry.distance_km > 500) {
        journalEntry.is_anomaly = true;
        journalEntry.anomaly_reason = (journalEntry.anomaly_reason ? journalEntry.anomaly_reason + '. ' : '') + 'Ovanligt lång resa (över 500 km)';
      }

      if (journalEntry.duration_minutes > 720) {
        journalEntry.is_anomaly = true;
        journalEntry.anomaly_reason = (journalEntry.anomaly_reason ? journalEntry.anomaly_reason + '. ' : '') + 'Ovanligt lång tid (över 12 timmar)';
      }

      await base44.asServiceRole.entities.DrivingJournalEntry.create(journalEntry);
      syncedTrips.push(journalEntry);
    }

    return Response.json({
      success: true,
      synced: syncedTrips.length,
      skipped: skippedTrips.length,
      trips: syncedTrips,
      skippedDetails: skippedTrips
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});