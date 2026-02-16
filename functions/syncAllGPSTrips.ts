import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

const GPS_URL = Deno.env.get("GALAGPS_URL") || "https://api.gps51.com";
const GPS_USERNAME = Deno.env.get("GALAGPS_USERNAME");
const GPS_PASSWORD = Deno.env.get("GALAGPS_PASSWORD");

let tokenCache = {
  token: null,
  expiresAt: null
};

async function getGPSToken() {
  if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

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

  tokenCache.token = data.token;
  tokenCache.expiresAt = Date.now() + (23 * 60 * 60 * 1000);

  return data.token;
}

async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'Base44-GPS-App/1.0' } }
    );
    if (!response.ok) return `${latitude}, ${longitude}`;
    const data = await response.json();
    return data.display_name || `${latitude}, ${longitude}`;
  } catch (e) {
    return `${latitude}, ${longitude}`;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default: synka från senaste 90 dagar för att få all historisk data
    let { startDate, endDate, maxVehicles } = await req.json();
    
    if (!startDate || !endDate) {
      const today = new Date();
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
      startDate = new Date(ninetyDaysAgo.getFullYear(), ninetyDaysAgo.getMonth(), ninetyDaysAgo.getDate(), 0, 0, 0).toISOString();
    }

    // Hämta alla fordon med GPS-enheter
    const allVehicles = await base44.asServiceRole.entities.Vehicle.list();
    const vehiclesWithGPS = allVehicles.filter(v => v.gps_device_id);

    const limit = maxVehicles || vehiclesWithGPS.length;
    const vehiclesToSync = vehiclesWithGPS.slice(0, limit);

    console.log(`Syncing trips for ${vehiclesToSync.length} vehicles...`);

    const token = await getGPSToken();
    let totalSynced = 0;
    let totalSkipped = 0;
    const results = [];

    for (const vehicle of vehiclesToSync) {
      try {
        console.log(`Processing ${vehicle.registration_number} (${vehicle.gps_device_id})...`);

        // Hämta resor från GPS API
        const response = await fetch(`${GPS_URL}/webapi?action=querytrips&token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceid: vehicle.gps_device_id,
            begintime: Math.floor(new Date(startDate).getTime() / 1000),
            endtime: Math.floor(new Date(endDate).getTime() / 1000),
            timezone: 1
          })
        });

        const text = await response.text();
        let gpsData;
        try {
          gpsData = JSON.parse(text);
        } catch (e) {
          console.log(`Failed to parse GPS response for ${vehicle.registration_number}: ${text.substring(0, 200)}`);
          continue;
        }

        if (gpsData.status !== 0) {
          console.log(`Failed to fetch trips for ${vehicle.registration_number}: ${gpsData.cause}`);
          continue;
        }

        const trips = gpsData.totaltrips || [];
        console.log(`Found ${trips.length} trips for ${vehicle.registration_number}`);

        if (trips.length === 0) {
          results.push({ vehicle: vehicle.registration_number, synced: 0, skipped: 0 });
          continue;
        }

        // Geokoda adresser
        const uniqueCoordinates = new Map();
        for (const trip of trips) {
          if (trip.slat && trip.slon) uniqueCoordinates.set(`${trip.slat},${trip.slon}`, null);
          if (trip.elat && trip.elon) uniqueCoordinates.set(`${trip.elat},${trip.elon}`, null);
        }

        let geocodeCount = 0;
        for (const [coordKey] of uniqueCoordinates) {
          if (geocodeCount > 0) await delay(1100);
          const [lat, lon] = coordKey.split(',');
          const address = await reverseGeocode(lat, lon);
          uniqueCoordinates.set(coordKey, address);
          geocodeCount++;
        }

        for (const trip of trips) {
          if (trip.slat && trip.slon) {
            const key = `${trip.slat},${trip.slon}`;
            trip.beginlocation = {
              latitude: trip.slat,
              longitude: trip.slon,
              address: uniqueCoordinates.get(key)
            };
          }
          if (trip.elat && trip.elon) {
            const key = `${trip.elat},${trip.elon}`;
            trip.endlocation = {
              latitude: trip.elat,
              longitude: trip.elon,
              address: uniqueCoordinates.get(key)
            };
          }
        }

        // Synka resor till databasen
        let syncedCount = 0;
        let skippedCount = 0;

        // Hämta befintliga resor för detta fordon
        const existing = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
          vehicle_id: vehicle.id
        });

        for (const trip of trips) {
          // Kontrollera om resan redan finns
          const matchingEntry = existing.find(e => {
            if (e.gps_trip_id === trip.tripid?.toString()) return true;
            const entryStart = new Date(e.start_time).getTime();
            const tripStart = trip.begintime * 1000;
            return Math.abs(entryStart - tripStart) < 5 * 60 * 1000;
          });

          if (matchingEntry) {
            if (!matchingEntry.gps_trip_id) {
              await base44.asServiceRole.entities.DrivingJournalEntry.update(matchingEntry.id, {
                gps_trip_id: trip.tripid?.toString()
              });
            }
            skippedCount++;
            continue;
          }

          // Skapa ny resa
          const journalEntry = {
            vehicle_id: vehicle.id,
            registration_number: vehicle.registration_number,
            gps_trip_id: trip.tripid?.toString(),
            start_time: new Date(trip.begintime * 1000).toISOString(),
            end_time: new Date(trip.endtime * 1000).toISOString(),
            distance_km: parseFloat((trip.mileage || 0).toFixed(2)),
            duration_minutes: Math.round((trip.endtime - trip.begintime) / 60),
            trip_type: 'väntar',
            status: 'pending_review',
            start_location: trip.beginlocation || null,
            end_location: trip.endlocation || null
          };

          if (vehicle.assigned_driver) {
            try {
              const allUsers = await base44.asServiceRole.entities.User.list();
              const driver = allUsers.find(u => u.email === vehicle.assigned_driver);
              if (driver) {
                journalEntry.driver_email = driver.email;
                journalEntry.driver_name = driver.full_name;
              }
            } catch (e) {
              console.log('Could not fetch driver');
            }
          }

          await base44.asServiceRole.entities.DrivingJournalEntry.create(journalEntry);
          syncedCount++;
        }

        totalSynced += syncedCount;
        totalSkipped += skippedCount;
        results.push({ 
          vehicle: vehicle.registration_number, 
          synced: syncedCount, 
          skipped: skippedCount 
        });

        console.log(`${vehicle.registration_number}: ${syncedCount} synced, ${skippedCount} skipped`);

      } catch (error) {
        console.error(`Error processing ${vehicle.registration_number}:`, error.message);
        results.push({ 
          vehicle: vehicle.registration_number, 
          error: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      totalVehicles: vehiclesToSync.length,
      totalSynced,
      totalSkipped,
      results
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});