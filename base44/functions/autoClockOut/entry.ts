import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Körs som scheduled job (varje timme)
// Stämplar automatiskt ut efter 12 timmar och notifierar admin
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const activeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ status: 'active' });

    const autoClockOutList = [];
    const warningList = [];

    for (const entry of activeEntries) {
      if (!entry.clock_in_time) continue;
      const clockInTime = new Date(entry.clock_in_time);
      const hoursWorked = (now - clockInTime) / (1000 * 60 * 60);

      // Auto clock-out after 12 hours
      if (hoursWorked >= 12) {
        const autoClockOutTime = new Date(clockInTime.getTime() + 12 * 60 * 60 * 1000);

        await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
          clock_out_time: autoClockOutTime.toISOString(),
          total_hours: 12,
          status: 'completed',
          anomaly_flag: true,
          anomaly_reason: `Automatisk utstämpling efter 12 timmar (kl ${autoClockOutTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}). Granska och korrigera vid behov.`,
          notes: (entry.notes ? entry.notes + '\n' : '') + `[System] Automatiskt utstämplad ${autoClockOutTime.toLocaleString('sv-SE')} efter 12h.`
        });

        autoClockOutList.push({ email: entry.employee_email, hours: Math.round(hoursWorked), clockIn: clockInTime, clockOut: autoClockOutTime, entryId: entry.id });
      }
      // Warning after 10 hours (if not already flagged)
      else if (hoursWorked >= 10 && !entry.anomaly_flag) {
        await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
          anomaly_flag: true,
          anomaly_reason: `Lång arbetsdag (${Math.floor(hoursWorked)}h). Påminnelse om utstämpling.`
        });
        warningList.push({ email: entry.employee_email, hours: Math.floor(hoursWorked) });
      }
    }

    // Fetch admins to notify
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin');

    const notifications = [];

    // Notify each auto-clocked-out employee
    for (const item of autoClockOutList) {
      notifications.push({
        recipient_email: item.email,
        type: 'forgot_clock_out',
        title: '⏱️ Automatisk utstämpling',
        message: `Du stämplades automatiskt ut kl ${item.clockOut.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })} efter 12 timmars arbetstid. Kontrollera och korrigera din tid vid behov.`,
        priority: 'high',
        is_read: false,
        sent_via: ['app'],
        related_entity_id: item.entryId,
        related_entity_type: 'TimeEntry'
      });
    }

    // Notify admins with a summary if any auto clock-outs happened
    if (autoClockOutList.length > 0) {
      const names = autoClockOutList.map(i => i.email).join(', ');
      for (const admin of admins) {
        notifications.push({
          recipient_email: admin.email,
          type: 'time_correction_needed',
          title: `🚨 ${autoClockOutList.length} automatisk utstämpling(ar)`,
          message: `Följande medarbetare stämplades automatiskt ut efter 12h: ${names}. Granska och korrigera tiderna.`,
          priority: 'urgent',
          is_read: false,
          sent_via: ['app']
        });
      }
    }

    // Create all notifications
    for (const n of notifications) {
      await base44.asServiceRole.entities.Notification.create(n);
    }

    return Response.json({
      success: true,
      active_entries_checked: activeEntries.length,
      auto_clocked_out: autoClockOutList.length,
      warnings_sent: warningList.length,
      notifications_created: notifications.length,
      details: autoClockOutList.map(i => ({ email: i.email, hours_worked: i.hours }))
    });

  } catch (error) {
    console.error('autoClockOut error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});