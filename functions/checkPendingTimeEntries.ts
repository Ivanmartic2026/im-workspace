import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Filtrera direkt i API-anropet istället för att hämta allt
    const allActive = await base44.asServiceRole.entities.TimeEntry.filter({ status: 'active' });
    
    const pendingEntries = allActive.filter(entry => {
      const clockInTime = new Date(entry.clock_in_time);
      return clockInTime < yesterday;
    });
    
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin');
    
    const notifications = [];
    
    for (const entry of pendingEntries) {
      notifications.push({
        recipient_email: entry.employee_email,
        type: 'forgot_clock_out',
        title: 'Glömt att stämpla ut?',
        message: `Du har en aktiv tidrapportering från ${new Date(entry.clock_in_time).toLocaleDateString('sv-SE')} som inte har stämplats ut.`,
        priority: 'high',
        sent_via: ['app'],
        related_entity_id: entry.id,
        related_entity_type: 'TimeEntry'
      });
    }
    
    if (pendingEntries.length > 0) {
      for (const admin of admins) {
        notifications.push({
          recipient_email: admin.email,
          type: 'system',
          title: 'Utestående tidrapporter',
          message: `Det finns ${pendingEntries.length} utestående tidrapport(er) som behöver granskas.`,
          priority: 'normal',
          sent_via: ['app']
        });
      }
    }
    
    for (const notification of notifications) {
      await base44.asServiceRole.entities.Notification.create(notification);
    }
    
    return Response.json({ 
      success: true, 
      checked: allActive.length,
      pending: pendingEntries.length,
      notifications_sent: notifications.length
    });
    
  } catch (error) {
    console.error('Error checking pending entries:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});