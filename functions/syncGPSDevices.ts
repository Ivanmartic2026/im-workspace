import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Autentisera admin
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }

  try {
    // Hämta alla GPS-enheter
    const gpsResponse = await base44.functions.invoke('gpsTracking', {
      action: 'getDeviceList',
      params: {}
    });

    if (gpsResponse.data.status !== 0) {
      throw new Error('Failed to fetch GPS devices: ' + gpsResponse.data.cause);
    }

    const allDevices = [];
    for (const group of gpsResponse.data.groups) {
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