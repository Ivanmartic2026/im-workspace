import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only allow admin to run this
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active time entries
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list();
    const activeEntries = allTimeEntries.filter(entry => entry.status === 'active');

    console.log(`Found ${activeEntries.length} active time entries`);

    // Send notification to each active user
    for (const entry of activeEntries) {
      const notification = {
        recipient_email: entry.employee_email,
        type: 'system',
        title: 'Du är fortfarande instämplad',
        message: `Du har varit instämplad sedan ${new Date(entry.clock_in_time).toLocaleTimeString('sv-SE')}`,
        priority: 'normal',
        is_read: false,
        sent_via: ['app', 'push']
      };

      await base44.asServiceRole.entities.Notification.create(notification);
      console.log(`Sent notification to ${entry.employee_email}`);
    }

    return Response.json({ 
      success: true, 
      notificationsCount: activeEntries.length 
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});