import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('Starting monthly summary generation...');

    // Get previous month dates
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

    console.log(`Generating summaries for ${startOfMonth.toLocaleDateString('sv-SE')} - ${endOfMonth.toLocaleDateString('sv-SE')}`);

    // Get all employees
    const employees = await base44.asServiceRole.entities.Employee.list();
    console.log(`Processing ${employees.length} employees`);

    const summaries = [];

    for (const employee of employees) {
      try {
        // Get time entries for the month
        const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
          employee_email: employee.user_email
        });

        const monthEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= startOfMonth && entryDate <= endOfMonth;
        });

        // Calculate total hours
        const totalHours = monthEntries.reduce((sum, entry) => {
          return sum + (entry.total_hours || 0);
        }, 0);

        // Calculate overtime
        const overtimeHours = monthEntries.reduce((sum, entry) => {
          return sum + (entry.overtime_hours || 0);
        }, 0);

        // Get driving journal entries
        const journalEntries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
          driver_email: employee.user_email
        });

        const monthJournalEntries = journalEntries.filter(entry => {
          const entryDate = new Date(entry.start_time);
          return entryDate >= startOfMonth && entryDate <= endOfMonth;
        });

        // Calculate distances
        const businessTrips = monthJournalEntries.filter(e => e.trip_type === 'tjänst');
        const privateTrips = monthJournalEntries.filter(e => e.trip_type === 'privat');

        const totalBusinessKm = businessTrips.reduce((sum, entry) => sum + (entry.distance_km || 0), 0);
        const totalPrivateKm = privateTrips.reduce((sum, entry) => sum + (entry.distance_km || 0), 0);

        // Get leave days
        const leaveRequests = await base44.asServiceRole.entities.LeaveRequest.filter({
          employee_email: employee.user_email,
          status: 'approved'
        });

        const monthLeaveRequests = leaveRequests.filter(request => {
          const startDate = new Date(request.start_date);
          return startDate >= startOfMonth && startDate <= endOfMonth;
        });

        const vacationDays = monthLeaveRequests
          .filter(r => r.type === 'semester')
          .reduce((sum, r) => sum + (r.days || 0), 0);

        const sickDays = monthLeaveRequests
          .filter(r => r.type === 'sjuk')
          .reduce((sum, r) => sum + (r.days || 0), 0);

        // Create summary object
        const summary = {
          employee_email: employee.user_email,
          month: lastMonth.toISOString().slice(0, 7),
          total_work_hours: Math.round(totalHours * 100) / 100,
          overtime_hours: Math.round(overtimeHours * 100) / 100,
          business_km: Math.round(totalBusinessKm * 10) / 10,
          private_km: Math.round(totalPrivateKm * 10) / 10,
          vacation_days: vacationDays,
          sick_days: sickDays,
          total_trips: monthJournalEntries.length,
          generated_at: new Date().toISOString()
        };

        summaries.push(summary);

        // Send notification to employee
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: employee.user_email,
          type: 'system',
          title: 'Månatlig sammanställning klar',
          message: `Din sammanställning för ${lastMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })} är klar. Arbetstimmar: ${summary.total_work_hours}h, Körsträcka: ${summary.business_km}km.`,
          priority: 'normal',
          is_read: false,
          sent_via: ['app', 'email']
        });

        console.log(`Summary created for ${employee.user_email}`);

      } catch (error) {
        console.error(`Error generating summary for ${employee.user_email}:`, error);
      }
    }

    // Send summary to admin
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of adminUsers) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: admin.email,
        type: 'system',
        title: 'Månatliga sammanställningar genererade',
        message: `${summaries.length} sammanställningar har genererats för ${lastMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}.`,
        priority: 'normal',
        is_read: false,
        sent_via: ['app', 'email']
      });
    }

    console.log(`Generated ${summaries.length} monthly summaries`);

    return Response.json({
      success: true,
      summaries_generated: summaries.length,
      period: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      },
      summaries,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in generateMonthlySummaries:', error);
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});