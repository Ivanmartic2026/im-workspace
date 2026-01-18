import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, params } = await req.json();

    const GPS_URL = Deno.env.get("GALAGPS_URL");
    const GPS_USERNAME = Deno.env.get("GALAGPS_USERNAME");
    const GPS_PASSWORD = Deno.env.get("GALAGPS_PASSWORD");

    if (!GPS_URL || !GPS_USERNAME || !GPS_PASSWORD) {
      return Response.json({ error: 'GPS credentials not configured' }, { status: 500 });
    }

    // Hämta GPS-enhetens ID från fordonet
    const vehicle = await base44.asServiceRole.entities.Vehicle.get(params.vehicleId);
    if (!vehicle?.gps_device_id) {
      return Response.json({ error: 'Vehicle has no GPS device configured' }, { status: 400 });
    }

    const deviceId = vehicle.gps_device_id;

    let smsCommand = '';

    switch (action) {
      case 'authorizeDevice': {
        // Auktorisera Bluetooth-enhet
        const { macAddress, driverName, driverCode, deviceType } = params;
        
        if (deviceType === 'beacon') {
          smsCommand = `KWSET,1,BLETAGMAC=${macAddress};${driverName};${driverCode}#`;
        } else {
          smsCommand = `KWSET,1,IDLIST=${macAddress};${driverName};${driverCode}#`;
        }
        break;
      }

      case 'enableClockIn': {
        // Aktivera automatisk in-/utcheckning
        const enabled = params.enabled ? 1 : 0;
        smsCommand = `KWSET,1,ENABLEID=${enabled}#`;
        break;
      }

      case 'enablePowerCutoff': {
        // Aktivera fjärrstyrning av ström/bränsle
        const enabled = params.enabled ? 1 : 0;
        smsCommand = `KWSET,1,IDRELAY=${enabled}#`;
        break;
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    // Skicka kommando till GPS-systemet
    const response = await fetch(`${GPS_URL}/StandardApiAction_sendCommand.action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: GPS_USERNAME,
        password: GPS_PASSWORD,
        devIdno: deviceId,
        command: smsCommand
      })
    });

    const result = await response.json();

    // Uppdatera BluetoothDevice-posten
    if (action === 'authorizeDevice' && result.result === 0) {
      await base44.asServiceRole.entities.BluetoothDevice.update(params.bluetoothDeviceId, {
        last_synced: new Date().toISOString()
      });
    }

    return Response.json({
      success: result.result === 0,
      message: result.reason || 'Command sent successfully',
      command: smsCommand,
      result
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});