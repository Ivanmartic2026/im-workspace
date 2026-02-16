import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

const GPS_URL = Deno.env.get("GALAGPS_URL") || "https://api.gps51.com";
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

  const text = await response.text();
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`GPS API returned non-JSON response. URL: ${GPS_URL}, Status: ${response.status}, Response: ${text.substring(0, 200)}`);
  }
  
  if (data.status !== 0) {
    throw new Error(`GPS login failed: ${data.cause || 'Unknown error'}`);
  }

  // Spara token med 23 timmars giltighet
  tokenCache.token = data.token;
  tokenCache.expiresAt = Date.now() + (23 * 60 * 60 * 1000);

  return data.token;
}

async function callGPSAPI(action, params = {}) {
  const token = await getGPSToken();
  
  const response = await fetch(`${GPS_URL}/webapi?action=${action}&token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const text = await response.text();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`GPS API returned non-JSON response for action '${action}'. Status: ${response.status}, Response: ${text.substring(0, 200)}`);
  }
}

async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) {
    return null;
  }
  try {
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Base44-GPS-App/1.0'
        }
      }
    );
    
    if (!nominatimResponse.ok) {
      console.warn(`Nominatim returned ${nominatimResponse.status} for ${latitude}, ${longitude}`);
      return `${latitude}, ${longitude}`;
    }
    
    const nominatimData = await nominatimResponse.json();
    return nominatimData.display_name || `${latitude}, ${longitude}`;
  } catch (e) {
    console.warn(`Could not reverse geocode ${latitude}, ${longitude}: ${e.message}`);
    return `${latitude}, ${longitude}`;
  }
}

// Helper to add delay between geocoding requests (Nominatim rate limit)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, params } = await req.json();

  try {
    let result;

    switch (action) {
      case 'getDeviceList':
        // Hämta alla GPS-enheter
        result = await callGPSAPI('querymonitorlist', { username: GPS_USERNAME });
        break;

      case 'getLastPosition':
        // Hämta senaste position för ett eller flera fordon
        const { deviceIds } = params;
        result = await callGPSAPI('lastposition', {
          deviceids: deviceIds,
          lastquerypositiontime: 0
        });
        break;

      case 'getTrackHistory':
        // Hämta körhistorik för ett fordon
        const { deviceId, startTime, endTime } = params;
        result = await callGPSAPI('querytracks', {
          deviceid: deviceId,
          begintime: startTime,
          endtime: endTime,
          timezone: 1  // UTC+1 för Sverige
        });
        break;

      case 'getTrips':
        // Hämta resor (baserat på tändning/släckning)
        result = await callGPSAPI('querytrips', {
          deviceid: params.deviceId,
          begintime: params.begintime,
          endtime: params.endtime,
          timezone: 1
        });

        // Returnera resor direkt med koordinater - klienten kan geokoda vid behov
        if (result && result.totaltrips && result.totaltrips.length > 0) {
          for (const trip of result.totaltrips) {
            if (trip.slat && trip.slon) {
              trip.beginlocation = {
                latitude: trip.slat,
                longitude: trip.slon,
                address: null // Klienten kan ladda detta vid behov
              };
            }
            if (trip.elat && trip.elon) {
              trip.endlocation = {
                latitude: trip.elat,
                longitude: trip.elon,
                address: null
              };
            }
          }
        }
        break;

      case 'getMileageReport':
        // Hämta detaljerad körstatistik
        result = await callGPSAPI('reportmileagedetail', {
          deviceid: params.deviceId,
          startday: params.startDay,
          endday: params.endDay,
          offset: 1
        });
        break;

      case 'getFuelReport':
        // Hämta bränsleförbrukning
        result = await callGPSAPI('reportoildaily', {
          devices: params.deviceIds,
          startday: params.startDay,
          endday: params.endDay,
          offset: 1
        });
        break;

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});