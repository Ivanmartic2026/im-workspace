import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId } = await req.json();

    if (!entryId) {
      return Response.json({ error: 'Missing entryId' }, { status: 400 });
    }

    // Fetch the entry
    const entries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({ id: entryId });
    if (!entries || entries.length === 0) {
      return Response.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = entries[0];

    // Only sync if fortnoxProjectNumber is set
    if (!entry.fortnoxProjectNumber) {
      return Response.json({ success: true, message: 'No Fortnox project assigned' });
    }

    // Prepare data for IM Lager
    const payload = {
      projectNumber: entry.fortnoxProjectNumber,
      date: entry.start_time ? new Date(entry.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      distanceKm: entry.distance_km || 0,
      description: entry.purpose || entry.notes || '',
      driverName: entry.driver_name || 'Unknown',
      vehicleReg: entry.registration_number || 'Unknown',
      costSEK: (entry.distance_km || 0) * 25, // 25 kr/km default
      source: 'imworkspace'
    };

    // Send to IM Lager
    const response = await fetch('https://app--69455d52c9eab36b7d26cc74.base44.app/functions/receiveDrivingJournal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('IM Lager sync error:', error);
      return Response.json({ success: false, error: 'Sync failed' }, { status: 500 });
    }

    const result = await response.json();
    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});