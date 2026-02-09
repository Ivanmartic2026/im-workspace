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
    const existingDeviceIds = new Set(existingVehicles.map(v => v.gps_device_id));

    const created = [];
    const skipped = [];
    const errors = [];

    // Skapa fordon för enheter som inte finns
    for (const device of allDevices) {
      const deviceId = device.deviceid;
      
      if (existingDeviceIds.has(deviceId)) {
        skipped.push({
          deviceId,
          deviceName: device.devicename,
          reason: 'Already exists'
        });
        continue;
      }

      try {
        // Skapa Vehicle-post
        const vehicleData = {
          registration_number: device.devicename || deviceId,
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

      } catch (error) {
        errors.push({
          deviceId,
          deviceName: device.devicename,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total: allDevices.length,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length
      },
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