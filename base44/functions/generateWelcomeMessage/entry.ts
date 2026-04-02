import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_id } = await req.json();

    // Get employee data
    const employees = await base44.entities.Employee.filter({ id: employee_id });
    if (employees.length === 0) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employee = employees[0];
    const users = await base44.entities.User.filter({ email: employee.user_email });
    const employeeUser = users[0];

    // Generate personalized welcome message with AI
    const prompt = `Generate a warm, personalized welcome message in Swedish for a new employee with the following details:
    
Name: ${employeeUser?.full_name || 'New Employee'}
Role: ${employee.job_title || 'Team Member'}
Department: ${employee.department || 'Company'}
Start Date: ${employee.start_date || 'Today'}

The message should:
- Be warm and welcoming
- Be encouraging about their new role
- Mention their department and role specifically
- Be 2-3 paragraphs long
- End with an encouraging note about their onboarding journey
- Be professional but friendly

Write the message in Swedish.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false
    });

    return Response.json({ 
      message: response,
      employee_name: employeeUser?.full_name,
      role: employee.job_title,
      department: employee.department
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});