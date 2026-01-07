import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Clock in
    const today = new Date().toISOString().split('T')[0];
    const clockInData = {
      employee_email: user.email,
      date: today,
      category: 'support_service',
      clock_in_time: new Date().toISOString(),
      status: 'active'
    };

    console.log('Creating clock in entry:', clockInData);
    const createdEntry = await base44.entities.TimeEntry.create(clockInData);
    console.log('Created entry:', createdEntry);

    // Wait a second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Clock out
    const clockOutTime = new Date();
    const clockInTime = new Date(createdEntry.clock_in_time);
    const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

    const updateData = {
      employee_email: createdEntry.employee_email,
      date: createdEntry.date,
      category: createdEntry.category,
      clock_in_time: createdEntry.clock_in_time,
      clock_out_time: clockOutTime.toISOString(),
      total_hours: Number(totalHours.toFixed(2)),
      status: 'completed'
    };

    console.log('Updating with:', updateData);
    const updatedEntry = await base44.entities.TimeEntry.update(createdEntry.id, updateData);
    console.log('Updated entry:', updatedEntry);

    return Response.json({ 
      success: true,
      created: createdEntry,
      updated: updatedEntry
    });
  } catch (error) {
    console.error('Test error:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});