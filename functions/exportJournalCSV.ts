import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate, vehicleId, employeeEmail } = await req.json();

    // Fetch all entries
    const allEntries = await base44.asServiceRole.entities.DrivingJournalEntry.list('-start_time', 500);
    
    // Filter by date range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    let entries = allEntries.filter(entry => {
      if (entry.is_deleted) return false;
      const entryDate = new Date(entry.start_time);
      return entryDate >= start && entryDate <= end;
    });

    // Filter by vehicle if specified
    if (vehicleId && vehicleId !== 'all') {
      entries = entries.filter(e => e.vehicle_id === vehicleId);
    }

    // Filter by employee if specified
    if (employeeEmail && employeeEmail !== 'all') {
      entries = entries.filter(e => e.driver_email === employeeEmail);
    }

    // Fetch vehicle data
    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const vehicleMap = {};
    vehicles.forEach(v => {
      vehicleMap[v.id] = v;
    });

    // Create CSV
    const headers = [
      'Registreringsnummer',
      'Fordon',
      'Förare',
      'Datum',
      'Starttid',
      'Sluttid',
      'Sträcka (km)',
      'Tid (min)',
      'Typ',
      'Syfte',
      'Projekt',
      'Kund',
      'Aktivitet',
      'Status',
      'Milersättning (kr)',
      'Avvikelse',
      'Startplats',
      'Slutplats'
    ];

    const rows = entries.map(entry => {
      const vehicle = vehicleMap[entry.vehicle_id];
      const startTime = new Date(entry.start_time);
      const endTime = new Date(entry.end_time);

      return [
        entry.registration_number || '',
        vehicle ? `${vehicle.make} ${vehicle.model}` : '',
        entry.driver_name || '',
        startTime.toLocaleDateString('sv-SE'),
        startTime.toLocaleTimeString('sv-SE'),
        endTime.toLocaleTimeString('sv-SE'),
        (entry.distance_km || 0).toFixed(2),
        Math.round(entry.duration_minutes || 0),
        entry.trip_type === 'tjänst' ? 'Tjänst' : entry.trip_type === 'privat' ? 'Privat' : 'Ej angiven',
        (entry.purpose || '').replace(/"/g, '""'),
        entry.project_code || '',
        entry.customer || '',
        entry.activity || '',
        entry.status === 'approved' ? 'Godkänd' : entry.status === 'submitted' ? 'Inskickad' : 'Väntande',
        (entry.mileage_allowance || 0).toFixed(2),
        entry.is_anomaly ? 'Ja' : 'Nej',
        entry.start_location?.address || '',
        entry.end_location?.address || ''
      ];
    });

    // Build CSV string
    const csvContent = [
      headers.map(h => `"${h}"`).join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    const filename = `korjournal_${startDate}_${endDate}.csv`;

    return new Response(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});