import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('Starting weekly project report generation...');

    // Get all open/active projects
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const openProjects = allProjects.filter(p => 
      p.status === 'pågående' || p.status === 'planerat'
    );

    console.log(`Found ${openProjects.length} open projects`);

    if (openProjects.length === 0) {
      return Response.json({ 
        message: 'No open projects found'
      });
    }

    // Get all time entries
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list('-date', 2000);

    // Calculate date range (last 7 days)
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekDate = lastWeek.toISOString().split('T')[0];

    // Get employees for names
    const employees = await base44.asServiceRole.entities.Employee.list();

    // Build report
    let reportLines = [
      '=== VECKORAPPORT - ÖPPNA PROJEKT ===',
      `Datum: ${now.toLocaleDateString('sv-SE')}`,
      `Period: Senaste 7 dagarna`,
      '',
      `Totalt antal öppna projekt: ${openProjects.length}`,
      '',
      '--- PROJEKT DETALJER ---',
      ''
    ];

    for (const project of openProjects) {
      // Get all time entries for this project
      const projectTimeEntries = allTimeEntries.filter(entry =>
        entry.project_allocations?.some(alloc => alloc.project_id === project.id)
      );

      // Get time entries from last week
      const weekEntries = projectTimeEntries.filter(entry => entry.date >= lastWeekDate);

      // Calculate total hours
      const totalHours = projectTimeEntries.reduce((sum, entry) => {
        const projectAlloc = entry.project_allocations?.find(alloc => alloc.project_id === project.id);
        return sum + (projectAlloc?.hours || 0);
      }, 0);

      // Calculate hours this week
      const weekHours = weekEntries.reduce((sum, entry) => {
        const projectAlloc = entry.project_allocations?.find(alloc => alloc.project_id === project.id);
        return sum + (projectAlloc?.hours || 0);
      }, 0);

      // Get unique employees
      const employeeHours = {};
      projectTimeEntries.forEach(entry => {
        const projectAlloc = entry.project_allocations?.find(alloc => alloc.project_id === project.id);
        if (projectAlloc && projectAlloc.hours > 0) {
          employeeHours[entry.employee_email] = (employeeHours[entry.employee_email] || 0) + projectAlloc.hours;
        }
      });

      const budgetStatus = project.budget_hours 
        ? `${totalHours.toFixed(1)}h / ${project.budget_hours}h (${(totalHours / project.budget_hours * 100).toFixed(1)}%)`
        : `${totalHours.toFixed(1)}h (ingen budget)`;

      const isOverBudget = project.budget_hours && totalHours > project.budget_hours;

      reportLines.push(`${'='.repeat(60)}`);
      reportLines.push(`Projekt: ${project.name} (${project.project_code})`);
      reportLines.push(`Status: ${project.status}${isOverBudget ? ' ⚠️ ÖVER BUDGET' : ''}`);
      if (project.customer) reportLines.push(`Kund: ${project.customer}`);
      if (project.description) reportLines.push(`Beskrivning: ${project.description}`);
      reportLines.push('');
      reportLines.push(`Total arbetad tid: ${totalHours.toFixed(1)}h`);
      reportLines.push(`Denna vecka: ${weekHours.toFixed(1)}h`);
      reportLines.push(`Budget status: ${budgetStatus}`);
      
      if (project.budget_hours && isOverBudget) {
        const overage = totalHours - project.budget_hours;
        reportLines.push(`⚠️ BUDGETÖVERSKRIDNING: +${overage.toFixed(1)}h`);
      }
      
      if (project.hourly_rate) {
        const cost = totalHours * project.hourly_rate;
        reportLines.push(`Uppskattad kostnad: ${cost.toLocaleString('sv-SE')} kr`);
      }
      
      reportLines.push('');
      
      if (Object.keys(employeeHours).length > 0) {
        reportLines.push(`Timmar per anställd (${Object.keys(employeeHours).length} st):`);
        Object.entries(employeeHours)
          .sort((a, b) => b[1] - a[1])
          .forEach(([email, hours]) => {
            const employeeName = employees.find(e => e.user_email === email)?.user_email?.split('@')[0] || email;
            reportLines.push(`  - ${employeeName}: ${hours.toFixed(1)}h`);
          });
      } else {
        reportLines.push('Inga timmar registrerade ännu');
      }
      
      reportLines.push('');
    }

    const reportText = reportLines.join('\n');
    
    console.log('Weekly report generated, sending to admins...');

    // Send email to all admins
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin');

    let emailsSent = 0;
    for (const admin of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `Veckorapport - Öppna projekt - ${now.toLocaleDateString('sv-SE')}`,
          body: `<pre>${reportText}</pre>`
        });
        emailsSent++;
        console.log(`Email sent to ${admin.email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
      }
    }

    console.log(`Weekly report completed. Emails sent: ${emailsSent}`);

    return Response.json({ 
      success: true,
      report: reportText,
      open_projects: openProjects.length,
      emails_sent: emailsSent
    });

  } catch (error) {
    console.error('Error generating weekly report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});