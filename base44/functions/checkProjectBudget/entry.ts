import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { time_entry_id } = await req.json();

    if (!time_entry_id) {
      return Response.json({ error: 'time_entry_id required' }, { status: 400 });
    }

    // Get the time entry
    const timeEntries = await base44.entities.TimeEntry.filter({ id: time_entry_id });
    if (timeEntries.length === 0) {
      return Response.json({ error: 'Time entry not found' }, { status: 404 });
    }

    const timeEntry = timeEntries[0];

    // Check if time entry has project allocations
    if (!timeEntry.project_allocations || timeEntry.project_allocations.length === 0) {
      return Response.json({ message: 'No project allocations to check' });
    }

    const notifications = [];

    // Check each project allocation
    for (const allocation of timeEntry.project_allocations) {
      const projectId = allocation.project_id;
      
      // Get project
      const projects = await base44.entities.Project.filter({ id: projectId });
      if (projects.length === 0) continue;
      
      const project = projects[0];

      // Get all time entries for this project
      const allTimeEntries = await base44.entities.TimeEntry.list('-date', 1000);
      const projectTimeEntries = allTimeEntries.filter(entry =>
        entry.project_allocations?.some(alloc => alloc.project_id === projectId)
      );

      // Calculate total hours for this project
      const totalHours = projectTimeEntries.reduce((sum, entry) => {
        const projectAlloc = entry.project_allocations?.find(alloc => alloc.project_id === projectId);
        return sum + (projectAlloc?.hours || 0);
      }, 0);

      // Check if over budget
      if (project.budget_hours && totalHours > project.budget_hours) {
        const overageHours = totalHours - project.budget_hours;
        const percentageUsed = (totalHours / project.budget_hours * 100).toFixed(1);

        // Create notification for project manager
        if (project.project_manager_email) {
          await base44.entities.Notification.create({
            recipient_email: project.project_manager_email,
            type: 'system',
            title: `Projektbudget överskriden: ${project.name}`,
            message: `Projektet "${project.name}" (${project.project_code}) har överskridit sin budget med ${overageHours.toFixed(1)} timmar. Total använd tid: ${totalHours.toFixed(1)}h av ${project.budget_hours}h (${percentageUsed}%)`,
            priority: 'high',
            sent_via: ['app'],
            metadata: {
              project_id: projectId,
              project_name: project.name,
              total_hours: totalHours,
              budget_hours: project.budget_hours,
              overage: overageHours
            }
          });
          notifications.push({
            project: project.name,
            recipient: project.project_manager_email,
            overage: overageHours
          });
        }

        // Notify admins too
        const users = await base44.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');
        
        for (const admin of admins) {
          await base44.entities.Notification.create({
            recipient_email: admin.email,
            type: 'system',
            title: `Budget Alert: ${project.name}`,
            message: `Projektet "${project.name}" är ${percentageUsed}% av budget (${totalHours.toFixed(1)}h / ${project.budget_hours}h)`,
            priority: 'high',
            sent_via: ['app']
          });
        }
      }
    }

    return Response.json({ 
      success: true, 
      notifications_sent: notifications.length,
      notifications 
    });

  } catch (error) {
    console.error('Error checking project budget:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});