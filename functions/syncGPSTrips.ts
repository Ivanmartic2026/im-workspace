import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

const GPS_URL = "https://api.gps51.com";
const GPS_USERNAME = Deno.env.get("GALAGPS_USERNAME");
const GPS_PASSWORD = Deno.env.get("GALAGPS_PASSWORD");

// Cache för GPS token (giltig i 24 timmar)
let tokenCache = {
  token: null,
  expiresAt: null
};

async function getGPSToken() {
  // Återanvänd token om den fortfarande är giltig
  if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  // Skapa MD5 hash av lösenord
  const md5Password = createHash('md5').update(GPS_PASSWORD).digest('hex');

  const response = await fetch(`${GPS_URL}/webapi?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: "USER",
      from: "WEB",
      username: GPS_USERNAME,
      password: md5Password,
      browser: "Base44"
    })
  });

  const data = await response.json();
  
  if (data.status !== 0) {
    throw new Error(`GPS login failed: ${data.cause || 'Unknown error'}`);
  }

  // Spara token med 23 timmars giltighet
  tokenCache.token = data.token;
  tokenCache.expiresAt = Date.now() + (23 * 60 * 60 * 1000);

  return data.token;
}



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

            // Försök söka bakåt tills vi hittar data
            const token = await getGPSToken();
            let requestStartDate = new Date(startDate);
            let requestEndDate = new Date(endDate);
            let gpsData = null;
            let daysBack = 0;

            // Försök från aktuell period och så långt tillbaka som 90 dagar
            while (daysBack <= 90) {
              const response = await fetch(`${GPS_URL}/webapi?action=querytrips&token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  deviceid: vehicleData.gps_device_id,
                  begintime: Math.floor(requestStartDate.getTime() / 1000),
                  endtime: Math.floor(requestEndDate.getTime() / 1000),
                  timezone: 1
                })
              });

              gpsData = await response.json();

              // Om vi fick data eller ett fel, bryt loopen
              if (gpsData.status !== 0 || (gpsData.totaltrips && gpsData.totaltrips.length > 0)) {
                break;
              }

              // Gå tillbaka en vecka och försök igen
              daysBack += 7;
              requestStartDate.setDate(requestStartDate.getDate() - 7);
              requestEndDate.setDate(requestEndDate.getDate() - 7);
            }

    // Logga GPS-svar för felsökning
    console.log('GPS API response:', JSON.stringify(gpsData, null, 2));
    console.log('Request params:', {
      deviceid: vehicleData.gps_device_id,
      begintime: Math.floor(new Date(startDate).getTime() / 1000),
      endtime: Math.floor(new Date(endDate).getTime() / 1000),
      timezone: 1
    });

    if (gpsData.status !== 0) {
      return Response.json({ 
        error: 'Failed to fetch GPS trips',
        details: gpsData 
      }, { status: 500 });
    }

    const trips = gpsData.totaltrips || [];

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
      // Validera att vi har nödvändig data
      if (!trip.begintime || !trip.endtime || !trip.tripid) {
        skippedTrips.push({ tripId: trip.tripid || 'unknown', reason: 'Missing required trip data' });
        continue;
      }

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
      if (trip.slat && trip.slon) {
        journalEntry.start_location = {
          latitude: trip.slat,
          longitude: trip.slon,
          address: null
        };
      }

      // Lägg till slutplats om tillgänglig
      if (trip.elat && trip.elon) {
        journalEntry.end_location = {
          latitude: trip.elat,
          longitude: trip.elon,
          address: null
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