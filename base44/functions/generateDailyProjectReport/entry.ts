import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('Starting daily project report generation...');

    // Calculate date range (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    console.log(`Fetching time entries from ${yesterdayDate}...`);

    // Get all time entries from the last 24 hours
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list('-date', 1000);
    const recentEntries = allTimeEntries.filter(entry => 
      entry.date >= yesterdayDate && entry.status === 'completed'
    );

    console.log(`Found ${recentEntries.length} completed time entries`);

    if (recentEntries.length === 0) {
      return Response.json({ 
        message: 'No completed time entries in the last 24 hours',
        entries_checked: allTimeEntries.length
      });
    }

    // Get all projects
    const projects = await base44.asServiceRole.entities.Project.list();

    // Calculate statistics per project
    const projectStats = {};
    
    recentEntries.forEach(entry => {
      if (!entry.project_allocations) return;
      
      entry.project_allocations.forEach(allocation => {
        const projectId = allocation.project_id;
        
        if (!projectStats[projectId]) {
          projectStats[projectId] = {
            hours: 0,
            entries: 0,
            employees: new Set()
          };
        }
        
        projectStats[projectId].hours += allocation.hours || 0;
        projectStats[projectId].entries += 1;
        projectStats[projectId].employees.add(entry.employee_email);
      });
    });

    // Build report
    let reportLines = [
      '=== DAGLIG PROJEKTRAPPORT ===',
      `Datum: ${now.toLocaleDateString('sv-SE')}`,
      `Period: Senaste 24 timmarna`,
      '',
      `Totalt antal slutförda tidrapporter: ${recentEntries.length}`,
      `Antal projekt med aktivitet: ${Object.keys(projectStats).length}`,
      '',
      '--- PROJEKT DETALJER ---',
      ''
    ];

    for (const [projectId, stats] of Object.entries(projectStats)) {
      const project = projects.find(p => p.id === projectId);
      if (!project) continue;

      const budgetStatus = project.budget_hours 
        ? `${stats.hours.toFixed(1)}h / ${project.budget_hours}h (${(stats.hours / project.budget_hours * 100).toFixed(1)}%)`
        : `${stats.hours.toFixed(1)}h (ingen budget)`;

      reportLines.push(`Projekt: ${project.name} (${project.project_code})`);
      reportLines.push(`  Status: ${project.status}`);
      reportLines.push(`  Arbetad tid idag: ${stats.hours.toFixed(1)}h`);
      reportLines.push(`  Budget status: ${budgetStatus}`);
      reportLines.push(`  Antal tidrapporter: ${stats.entries}`);
      reportLines.push(`  Antal anställda: ${stats.employees.size}`);
      reportLines.push('');
    }

    const reportText = reportLines.join('\n');
    
    console.log('Report generated, sending to admins...');

    // Send email to all admins
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter(u => u.role === 'admin');

    let emailsSent = 0;
    for (const admin of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `Daglig projektrapport - ${now.toLocaleDateString('sv-SE')}`,
          body: `<pre>${reportText}</pre>`
        });
        emailsSent++;
        console.log(`Email sent to ${admin.email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
      }
    }

    console.log(`Daily report completed. Emails sent: ${emailsSent}`);

    return Response.json({ 
      success: true,
      report: reportText,
      projects_included: Object.keys(projectStats).length,
      time_entries_processed: recentEntries.length,
      emails_sent: emailsSent
    });

  } catch (error) {
    console.error('Error generating daily report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});