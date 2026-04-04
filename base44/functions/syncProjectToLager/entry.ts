import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { fortnoxProjectNumber } = await req.json();
    if (!fortnoxProjectNumber) return Response.json({ error: 'Missing fortnoxProjectNumber' }, { status: 400 });

    const LAGER_URL = 'https://lager-ai-7d26cc74.base44.app/functions';
    let timesSynced = 0, drivingSynced = 0, errors = [];

    // Step 1: Find the IM Workspace Project by fortnoxProjectNumber
    let wsProjectId = null;
    try {
      const projects = await base44.asServiceRole.entities.Project.filter({ fortnoxProjectNumber });
      if (projects.length > 0) wsProjectId = projects[0].id;
    } catch (e) { errors.push('ProjectLookup: ' + e.message); }

    // Step 2: Sync TimeEntry records
    try {
      let timeEntries = [];
      if (wsProjectId) {
        try { timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ project_id: wsProjectId }); } catch (e2) {}
      }
      if (timeEntries.length === 0) {
        const allEntries = await base44.asServiceRole.entities.TimeEntry.list();
        timeEntries = allEntries.filter(e =>
          e.fortnoxProjectNumber === fortnoxProjectNumber ||
          (wsProjectId && (e.project_id === wsProjectId ||
            (e.project_allocations || []).some(pa => pa.project_id === wsProjectId)))
        );
      }
      for (const entry of timeEntries) {
        const hours = entry.hours || entry.total_hours || entry.duration || 0;
        if (!hours) continue;
        await fetch(`${LAGER_URL}/receiveWorkspaceTime`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectNumber: fortnoxProjectNumber,
            projectName: entry.projectName || fortnoxProjectNumber,
            date: entry.date || entry.work_date || (entry.clock_in_time ? entry.clock_in_time.substring(0, 10) : null),
            hours,
            description: entry.description || entry.notes || entry.task || '',
            reporter: entry.employee_name || entry.employeeName || entry.reporter || entry.employee_email || '',
            hourlyRate: entry.hourlyRate || 0
          })
        });
        timesSynced++;
      }
    } catch (e) { errors.push('TimeEntry: ' + e.message); }

    // Step 3: Sync DrivingJournalEntry records
    try {
      let drivingEntries = [];
      if (wsProjectId) {
        try { drivingEntries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({ project_id: wsProjectId }); } catch (e2) {}
      }
      if (drivingEntries.length === 0) {
        try { drivingEntries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({ fortnoxProjectNumber }); } catch (e2) {}
      }
      for (const entry of drivingEntries) {
        const distanceKm = entry.distance_km || entry.distance || 0;
        await fetch(`${LAGER_URL}/receiveDrivingJournal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectNumber: fortnoxProjectNumber,
            date: entry.date || entry.trip_date,
            distanceKm,
            description: entry.purpose || entry.description || '',
            driverName: entry.driver_name || entry.driverName || '',
            vehicleReg: entry.vehicle_registration || entry.vehicleReg || '',
            costSEK: entry.mileage_allowance || entry.costSEK || distanceKm * 25,
            source: 'imworkspace'
          })
        });
        drivingSynced++;
      }
    } catch (e) { errors.push('DrivingJournal: ' + e.message); }

    return Response.json({ success: true, timesSynced, drivingSynced, errors, wsProjectId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});