import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

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

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.text('Körjournal - Rapport', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    const periodText = `Period: ${start.toLocaleDateString('sv-SE')} - ${end.toLocaleDateString('sv-SE')}`;
    doc.text(periodText, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Summary stats
    const totalDistance = entries.reduce((sum, e) => sum + (e.distance_km || 0), 0);
    const businessTrips = entries.filter(e => e.trip_type === 'tjänst').length;
    const privateTrips = entries.filter(e => e.trip_type === 'privat').length;
    const totalMileageAllowance = entries.reduce((sum, e) => sum + (e.mileage_allowance || 0), 0);

    doc.setFontSize(10);
    doc.text(`Totalt antal resor: ${entries.length}`, 20, y);
    y += 7;
    doc.text(`Total körsträcka: ${totalDistance.toFixed(1)} km`, 20, y);
    y += 7;
    doc.text(`Tjänsteresor: ${businessTrips}`, 20, y);
    y += 7;
    doc.text(`Privatresor: ${privateTrips}`, 20, y);
    y += 7;
    doc.text(`Total milersättning: ${totalMileageAllowance.toFixed(2)} kr`, 20, y);
    y += 15;

    // Group by vehicle
    const vehicleGroups = {};
    entries.forEach(entry => {
      if (!vehicleGroups[entry.vehicle_id]) {
        vehicleGroups[entry.vehicle_id] = [];
      }
      vehicleGroups[entry.vehicle_id].push(entry);
    });

    // Print each vehicle's trips
    for (const [vehicleId, vehicleEntries] of Object.entries(vehicleGroups)) {
      const vehicle = vehicleMap[vehicleId];
      
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Vehicle header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(vehicle?.registration_number || vehicleId, 20, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      y += 7;

      if (vehicle) {
        doc.text(`${vehicle.make} ${vehicle.model}`, 20, y);
        y += 10;
      } else {
        y += 5;
      }

      // Trip table headers
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Datum', 20, y);
      doc.text('Typ', 55, y);
      doc.text('Sträcka', 85, y);
      doc.text('Syfte', 115, y);
      doc.setFont(undefined, 'normal');
      y += 5;

      // Draw line
      doc.line(20, y, pageWidth - 20, y);
      y += 5;

      // Print trips
      for (const entry of vehicleEntries) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const date = new Date(entry.start_time).toLocaleDateString('sv-SE');
        const type = entry.trip_type === 'tjänst' ? 'Tjänst' : entry.trip_type === 'privat' ? 'Privat' : 'Ej angiven';
        const distance = `${(entry.distance_km || 0).toFixed(1)} km`;
        const purpose = (entry.purpose || 'Inget syfte angivet').substring(0, 40);

        doc.text(date, 20, y);
        doc.text(type, 55, y);
        doc.text(distance, 85, y);
        doc.text(purpose, 115, y);
        y += 6;
      }

      y += 10;
    }

    // Footer
    doc.setFontSize(8);
    doc.text(`Genererad: ${new Date().toLocaleString('sv-SE')}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    const filename = `korjournal_${startDate}_${endDate}.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
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