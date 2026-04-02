import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startLat, startLng, endLat, endLng } = await req.json();

    if (!startLat || !startLng || !endLat || !endLng) {
      return Response.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    // Använd OSRM (Open Source Routing Machine) för ruttberäkning
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    const response = await fetch(osrmUrl);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return Response.json({ error: 'Could not calculate route' }, { status: 400 });
    }

    const route = data.routes[0];
    const distanceKm = route.distance / 1000; // Meter till km
    const durationMinutes = route.duration / 60; // Sekunder till minuter

    return Response.json({
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      route_geojson: route.geometry,
      summary: `${distanceKm.toFixed(1)} km, ${Math.round(durationMinutes)} min`
    });

  } catch (error) {
    console.error('Error calculating route:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});