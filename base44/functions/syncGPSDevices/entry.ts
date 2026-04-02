import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

const GPS_URL = Deno.env.get("GALAGPS_URL") || "https://api.gps51.com";
const GPS_USERNAME = Deno.env.get("GALAGPS_USERNAME");
const GPS_PASSWORD = Deno.env.get("GALAGPS_PASSWORD");

async function getGPSToken() {
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

  return data.token;
}

async function callGPSAPI(action, params = {}) {
  const token = await getGPSToken();
  
  const response = await fetch(`${GPS_URL}/webapi?action=${action}&token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  return await response.json();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Autentisera admin
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }

  try {
    // Hämta alla GPS-enheter direkt
    const gpsData = await callGPSAPI('querymonitorlist', { username: GPS_USERNAME });

    if (gpsData.status !== 0) {
      throw new Error('Failed to fetch GPS devices: ' + gpsData.cause);
    }

    const allDevices = [];
    for (const group of gpsData.groups) {
      if (group.devices && Array.isArray(group.devices)) {
        allDevices.push(...group.devices);
      }
    }

    // Hämta befintliga fordon
    const existingVehicles = await base44.asServiceRole.entities.Vehicle.list();
    
    const updated = [];
    const created = [];
    const skipped = [];
    const errors = [];

    // Skapa en map av registreringsnummer till fordon
    const vehiclesByRegNo = new Map();
    existingVehicles.forEach(v => {
      if (v.registration_number) {
        vehiclesByRegNo.set(v.registration_number.toLowerCase(), v);
      }
    });

    // För varje GPS-enhet, matcha med fordon
    for (const device of allDevices) {
      const deviceId = device.deviceid;
      const deviceName = device.devicename || deviceId;
      
      try {
        // Leta efter fordon med matchande registreringsnummer
        const matchingVehicle = vehiclesByRegNo.get(deviceName.toLowerCase());
        
        if (matchingVehicle) {
          // Uppdatera GPS device ID om det inte stämmer
          if (matchingVehicle.gps_device_id !== deviceId) {
            await base44.asServiceRole.entities.Vehicle.update(matchingVehicle.id, {
              gps_device_id: deviceId
            });
            
            updated.push({
              vehicleId: matchingVehicle.id,
              registrationNumber: matchingVehicle.registration_number,
              oldDeviceId: matchingVehicle.gps_device_id,
              newDeviceId: deviceId
            });
          } else {
            skipped.push({
              vehicleId: matchingVehicle.id,
              registrationNumber: matchingVehicle.registration_number,
              deviceId,
              reason: 'GPS device ID already correct'
            });
          }
        } else {
          // Skapa nytt fordon om det inte finns
          const vehicleData = {
            registration_number: deviceName,
            gps_device_id: deviceId,
            make: 'Okänd',
            model: 'GPS-enhet',
            category: 'personbil',
            vehicle_type: 'personbil',
            fuel_type: 'bensin',
            is_pool_vehicle: false,
            status: 'aktiv',
            notes: `Automatiskt importerad från GPS-system. Device type: ${device.devicetype}`
          };

          const newVehicle = await base44.asServiceRole.entities.Vehicle.create(vehicleData);
          
          created.push({
            vehicleId: newVehicle.id,
            deviceId: deviceId,
            registrationNumber: vehicleData.registration_number
          });
        }

      } catch (error) {
        errors.push({
          deviceId,
          deviceName,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total: allDevices.length,
        updated: updated.length,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length
      },
      updated,
      created,
      skipped,
      errors
    });

  } catch (error) {
    return Response.json({
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});