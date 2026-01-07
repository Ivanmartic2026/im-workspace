import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Testing clock in/out for user:', user.email);

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
    console.log('Created entry:', JSON.stringify(createdEntry, null, 2));

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Fetch the entry again using list() to ensure all fields
    console.log('Fetching all entries to find our entry...');
    const allEntries = await base44.entities.TimeEntry.list();
    const ourEntry = allEntries.find(e => e.id === createdEntry.id);
    console.log('Fetched entry:', JSON.stringify(ourEntry, null, 2));

    if (!ourEntry) {
      throw new Error('Could not find entry after creation');
    }

    // Step 3: Clock out
    const clockOutTime = new Date();
    const clockInTime = new Date(ourEntry.clock_in_time);
    const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

    const updateData = {
      employee_email: ourEntry.employee_email,
      date: ourEntry.date,
      category: ourEntry.category,
      clock_in_time: ourEntry.clock_in_time,
      clock_out_time: clockOutTime.toISOString(),
      total_hours: Number(totalHours.toFixed(2)),
      status: 'completed',
      break_minutes: ourEntry.break_minutes || 0
    };

    console.log('Updating with:', JSON.stringify(updateData, null, 2));
    const updatedEntry = await base44.entities.TimeEntry.update(ourEntry.id, updateData);
    console.log('Updated entry:', JSON.stringify(updatedEntry, null, 2));

    return Response.json({ 
      success: true,
      message: 'Clock in/out test successful!',
      created: createdEntry,
      fetched: ourEntry,
      updated: updatedEntry
    });
  } catch (error) {
    console.error('Test error:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString(),
      stack: error.stack
    }, { status: 500 });
  }
});