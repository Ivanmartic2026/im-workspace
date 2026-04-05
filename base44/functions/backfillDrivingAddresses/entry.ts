import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function coordsToAddress(lat, lng) {
  if (!lat || !lng) return '';
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: { 'User-Agent': 'IM-Lager-App/1.0' }
    });
    const data = await resp.json();
    const addr = data.address;
    const street = (addr.road || '') + (addr.house_number ? ' ' + addr.house_number : '');
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    return [street, city].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || '';
  } catch (e) { return ''; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const entries = await base44.asServiceRole.entities.DrivingJournalEntry.list();
    let updated = 0;
    const errors = [];

    for (const entry of entries) {
      const updates = {};

      // Backfill fromAddress
      if (!entry.fromAddress && entry.start_location?.latitude) {
        const addr = await coordsToAddress(entry.start_location.latitude, entry.start_location.longitude);
        if (addr) {
          updates.fromAddress = addr;
          updates.fromLat = entry.start_location.latitude;
          updates.fromLng = entry.start_location.longitude;
        }
      }

      // Backfill toAddress
      if (!entry.toAddress && entry.end_location?.latitude) {
        const addr = await coordsToAddress(entry.end_location.latitude, entry.end_location.longitude);
        if (addr) {
          updates.toAddress = addr;
          updates.toLat = entry.end_location.latitude;
          updates.toLng = entry.end_location.longitude;
        }
      }

      // Backfill flat time fields
      if (!entry.startTime && entry.start_time) updates.startTime = entry.start_time;
      if (!entry.endTime && entry.end_time) updates.endTime = entry.end_time;

      if (Object.keys(updates).length > 0) {
        try {
          await base44.asServiceRole.entities.DrivingJournalEntry.update(entry.id, updates);
          updated++;
        } catch (e) {
          errors.push(`Entry ${entry.id}: ${e.message}`);
        }
      }

      // Small delay to respect Nominatim rate limit (1 req/sec)
      if (updates.fromAddress || updates.toAddress) {
        await new Promise(r => setTimeout(r, 1100));
      }
    }

    return Response.json({ success: true, updated, errors, total: entries.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});