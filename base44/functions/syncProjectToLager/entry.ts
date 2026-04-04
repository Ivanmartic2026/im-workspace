import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { fortnoxProjectNumber } = await req.json();

    if (!fortnoxProjectNumber) {
      return Response.json({ error: 'Missing fortnoxProjectNumber' }, { status: 400 });
    }

    const LAGER_URL = 'https://lager-ai-7d26cc74.base44.app/functions';
    let timesSynced = 0, drivingSynced = 0, errors = [];

    // Sync TimeEntry records
    try {
      const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ fortnoxProjectNumber });
      for (const entry of timeEntries) {
        await fetch(`${LAGER_URL}/receiveWorkspaceTime`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectNumber: fortnoxProjectNumber,
            projectName: entry.projectName || fortnoxProjectNumber,
            date: entry.date,
            hours: entry.hours || entry.total_hours || 0,
            description: entry.description || entry.notes || '',
            reporter: entry.employeeName || entry.reporter || entry.created_by || '',
            hourlyRate: entry.hourlyRate || 0
          })
        });
        timesSynced++;
      }
    } catch (e) {
      errors.push('TimeEntry: ' + e.message);
    }

    // Sync DrivingJournalEntry records
    try {
      const drivingEntries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({ fortnoxProjectNumber });
      for (const entry of drivingEntries) {
        await fetch(`${LAGER_URL}/receiveDrivingJournal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectNumber: fortnoxProjectNumber,
            date: entry.date || entry.start_time,
            distanceKm: entry.distance_km || 0,
            description: entry.purpose || entry.description || '',
            driverName: entry.driver_name || '',
            vehicleReg: entry.registration_number || '',
            costSEK: entry.mileage_allowance || (entry.distance_km || 0) * 25,
            source: 'imworkspace'
          })
        });
        drivingSynced++;
      }
    } catch (e) {
      errors.push('DrivingJournal: ' + e.message);
    }

    return Response.json({ success: true, timesSynced, drivingSynced, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});