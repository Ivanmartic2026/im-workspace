import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Denna funktion ska köras som en scheduled job (t.ex. varje timme eller vid midnatt)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Hämta alla aktiva tidrapporter
    const activeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
      status: 'active'
    });

    const now = new Date();
    const updates = [];
    const notifications = [];

    for (const entry of activeEntries) {
      const clockInTime = new Date(entry.clock_in_time);
      const hoursWorked = (now - clockInTime) / (1000 * 60 * 60);

      // Automatisk utstämpling efter 14 timmar
      if (hoursWorked >= 14) {
        const autoClockOutTime = new Date(clockInTime.getTime() + (14 * 60 * 60 * 1000));
        
        await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
          clock_out_time: autoClockOutTime.toISOString(),
          total_hours: 14,
          status: 'completed',
          anomaly_flag: true,
          anomaly_reason: 'Automatisk utstämpling efter 14 timmar. Kontrollera att tiden är korrekt.',
          notes: (entry.notes || '') + '\n[System] Automatiskt utstämplad efter 14 timmar.'
        });

        notifications.push({
          employee: entry.employee_email,
          action: 'auto_clock_out',
          hours: hoursWorked
        });
      }
      // Varning efter 10 timmar (om inte redan flaggad)
      else if (hoursWorked >= 10 && !entry.anomaly_flag) {
        await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
          anomaly_flag: true,
          anomaly_reason: `Lång arbetsdag (${Math.round(hoursWorked)} timmar). Glöm inte att stämpla ut.`
        });

        notifications.push({
          employee: entry.employee_email,
          action: 'overtime_warning',
          hours: hoursWorked
        });
      }
    }

    return Response.json({
      status: 'success',
      processed: activeEntries.length,
      updates: updates.length,
      notifications: notifications.length,
      details: notifications
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});