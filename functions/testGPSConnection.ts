import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

const GPS_URL = Deno.env.get("GALAGPS_URL") || "https://api.gps51.com";
const GPS_USERNAME = Deno.env.get("GALAGPS_USERNAME");
const GPS_PASSWORD = Deno.env.get("GALAGPS_PASSWORD");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('GPS_URL:', GPS_URL);
    console.log('GPS_USERNAME:', GPS_USERNAME);
    console.log('GPS_PASSWORD exists:', !!GPS_PASSWORD);

    const md5Password = createHash('md5').update(GPS_PASSWORD).digest('hex');
    console.log('Attempting login to GPS API...');

    const loginResponse = await fetch(`${GPS_URL}/webapi?action=login`, {
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

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (loginData.status !== 0) {
      return Response.json({
        success: false,
        error: `Login failed: ${loginData.cause || 'Unknown error'}`,
        response: loginData
      });
    }

    const token = loginData.token;
    console.log('Login successful, token:', token.substring(0, 20) + '...');

    // Test hämtning av enheter
    const devicesResponse = await fetch(`${GPS_URL}/webapi?action=querydevices&token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const devicesData = await devicesResponse.json();
    console.log('Devices response status:', devicesData.status);
    console.log('Devices count:', devicesData.devices?.length || 0);

    return Response.json({
      success: true,
      message: 'GPS connection successful',
      login: {
        status: loginData.status,
        token: token.substring(0, 20) + '...'
      },
      devices: {
        status: devicesData.status,
        count: devicesData.devices?.length || 0,
        sample: devicesData.devices?.slice(0, 3) || []
      }
    });

  } catch (error) {
    console.error('Test error:', error.message);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});