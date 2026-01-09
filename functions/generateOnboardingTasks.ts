import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { employee_id, template_id } = await req.json();

    if (!employee_id || !template_id) {
      return Response.json({ error: 'Missing employee_id or template_id' }, { status: 400 });
    }

    // Get employee
    const employees = await base44.asServiceRole.entities.Employee.filter({ id: employee_id });
    if (employees.length === 0) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }
    const employee = employees[0];

    // Get template
    const templates = await base44.asServiceRole.entities.OnboardingTemplate.filter({ id: template_id });
    if (templates.length === 0) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }
    const template = templates[0];

    // Calculate start date
    const startDate = employee.start_date ? new Date(employee.start_date) : new Date();

    // Get manager email
    let managerEmail = employee.manager_email;
    if (!managerEmail) {
      // Try to find manager from department
      const managers = await base44.asServiceRole.entities.Employee.filter({
        is_manager: true,
        manages_departments: employee.department
      });
      if (managers.length > 0) {
        managerEmail = managers[0].user_email;
      }
    }

    // Create tasks from template
    const tasks = template.tasks || [];
    const createdTasks = [];

    for (const taskConfig of tasks) {
      // Calculate due date
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (taskConfig.days_after_start || 0));

      // Determine assigned_to_email based on role
      let assignedToEmail = employee.user_email;
      if (taskConfig.assigned_to_role === 'manager' && managerEmail) {
        assignedToEmail = managerEmail;
      } else if (taskConfig.assigned_to_role === 'hr') {
        // Find HR users
        const hrEmployees = await base44.asServiceRole.entities.Employee.filter({ department: 'HR' });
        if (hrEmployees.length > 0) {
          assignedToEmail = hrEmployees[0].user_email;
        }
      }

      const task = await base44.asServiceRole.entities.OnboardingTask.create({
        employee_id: employee.id,
        employee_email: employee.user_email,
        template_id: template.id,
        title: taskConfig.title,
        description: taskConfig.description || '',
        due_date: dueDate.toISOString().split('T')[0],
        assigned_to_email: assignedToEmail,
        assigned_to_role: taskConfig.assigned_to_role || 'employee',
        status: 'pending',
        is_critical: taskConfig.is_critical || false,
        related_resource_url: taskConfig.related_resource_url || '',
        admin_notes: taskConfig.admin_notes || ''
      });

      createdTasks.push(task);

      // Send notification to assigned person
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: assignedToEmail,
        type: 'system',
        title: 'Ny onboarding-uppgift',
        message: `Du har tilldelats uppgiften "${taskConfig.title}" för ${employee.user_email}`,
        priority: taskConfig.is_critical ? 'high' : 'normal',
        is_read: false,
        related_entity_id: task.id,
        related_entity_type: 'OnboardingTask',
        sent_via: ['app', 'push']
      });
    }

    return Response.json({
      success: true,
      created_tasks: createdTasks.length,
      tasks: createdTasks
    });

  } catch (error) {
    console.error('Error generating onboarding tasks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});