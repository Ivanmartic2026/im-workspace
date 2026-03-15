import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
      { headers: { 'User-Agent': 'Base44-GPS-App/1.0' } }
    );
    if (!response.ok) return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    const data = await response.json();
    // Returnera kortare adress: väg + stad
    if (data.address) {
      const parts = [
        data.address.road || data.address.pedestrian || data.address.path,
        data.address.house_number,
        data.address.city || data.address.town || data.address.village || data.address.municipality
      ].filter(Boolean);
      return parts.join(' ') || data.display_name;
    }
    return data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  } catch (e) {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Tillåt anrop utan auth för automatisering, men kräv admin om inloggad
    let isAutomation = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      isAutomation = true;
    }

    // Hämta resor som saknar adress (max 20 per körning för att hålla sig under timeout)
    const BATCH_SIZE = 20;

    const allEntries = await base44.asServiceRole.entities.DrivingJournalEntry.list('-created_date', 500);

    const needsGeocode = allEntries.filter(e => {
      const missingStart = e.start_location?.latitude && !e.start_location?.address;
      const missingEnd = e.end_location?.latitude && !e.end_location?.address;
      return missingStart || missingEnd;
    });

    const toProcess = needsGeocode.slice(0, BATCH_SIZE);

    console.log(`Found ${needsGeocode.length} entries needing geocoding, processing ${toProcess.length}`);

    let updated = 0;

    for (const entry of toProcess) {
      const updates = {};

      if (entry.start_location?.latitude && !entry.start_location?.address) {
        const addr = await reverseGeocode(entry.start_location.latitude, entry.start_location.longitude);
        await delay(1100);
        updates.start_location = { ...entry.start_location, address: addr };
      }

      if (entry.end_location?.latitude && !entry.end_location?.address) {
        const addr = await reverseGeocode(entry.end_location.latitude, entry.end_location.longitude);
        await delay(1100);
        updates.end_location = { ...entry.end_location, address: addr };
      }

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.DrivingJournalEntry.update(entry.id, updates);
        updated++;
      }
    }

    return Response.json({
      success: true,
      totalNeedsGeocode: needsGeocode.length,
      processed: toProcess.length,
      updated,
      remaining: Math.max(0, needsGeocode.length - toProcess.length)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});