import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled calls (no user) or admin calls
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } catch {
      // No user = scheduled/automated call, allow it
    }

    console.log('Starting time report reminders...');

    const employees = await base44.asServiceRole.entities.Employee.list();
    console.log(`Found ${employees.length} employees`);

    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('Weekend - skipping reminders');
      return Response.json({ 
        message: 'Weekend - no reminders sent',
        date: today.toISOString()
      });
    }

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const reminders = [];

    for (const employee of employees) {
      try {
        const weeklyReports = await base44.asServiceRole.entities.WeeklyReport.filter({
          employee_email: employee.user_email,
          week_start_date: startOfWeek.toISOString().split('T')[0],
          status: 'ej_klar'
        });

        if (weeklyReports.length > 0) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: employee.user_email,
            type: 'time_correction_needed',
            title: 'Påminnelse: Ofullständig veckorapport',
            message: `Din veckorapport för veckan är inte komplett. Vänligen slutför dina tidrapporter.`,
            priority: 'normal',
            is_read: false,
            sent_via: ['app', 'push']
          });
          reminders.push({ type: 'weekly_report', employee: employee.user_email });
        }

        const pendingJournalEntries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
          driver_email: employee.user_email,
          status: 'pending_review'
        });

        if (pendingJournalEntries.length > 3) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: employee.user_email,
            type: 'system',
            title: 'Påminnelse: Körjournal',
            message: `Du har ${pendingJournalEntries.length} resor som väntar på kategorisering i din körjournal.`,
            priority: 'normal',
            is_read: false,
            action_url: '/DrivingJournal',
            sent_via: ['app', 'push']
          });
          reminders.push({ type: 'journal_entries', employee: employee.user_email, count: pendingJournalEntries.length });
        }

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const activeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
          employee_email: employee.user_email,
          status: 'active'
        });

        for (const entry of activeEntries) {
          const clockInDate = new Date(entry.clock_in_time);
          if (clockInDate < yesterday) {
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: employee.user_email,
              type: 'forgot_clock_out',
              title: 'Glömt att stämpla ut?',
              message: `Du har en aktiv tidrapport från ${clockInDate.toLocaleDateString('sv-SE')} som inte är avslutad.`,
              priority: 'high',
              is_read: false,
              action_url: '/TimeTracking',
              sent_via: ['app', 'push']
            });
            reminders.push({ type: 'forgot_clock_out', employee: employee.user_email });
          }
        }
      } catch (error) {
        console.error(`Error processing reminders for ${employee.user_email}:`, error);
      }
    }

    console.log(`Sent ${reminders.length} reminders`);

    return Response.json({
      success: true,
      reminders_sent: reminders.length,
      details: reminders,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in sendTimeReportReminders:', error);
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});