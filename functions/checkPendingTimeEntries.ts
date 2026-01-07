import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Hämta alla time entries som är äldre än 24 timmar och fortfarande aktiva
    const allEntries = await base44.asServiceRole.entities.TimeEntry.list();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const pendingEntries = allEntries.filter(entry => {
      const clockInTime = new Date(entry.clock_in_time);
      return entry.status === 'active' && clockInTime < yesterday;
    });
    
    // Hämta alla admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin');
    
    // Skicka notifikationer
    const notifications = [];
    
    // Notifiera användare om utestående tidrapporter
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
    
    // Notifiera admins om utestående tidrapporter
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
    
    // Skapa alla notifikationer
    for (const notification of notifications) {
      await base44.asServiceRole.entities.Notification.create(notification);
    }
    
    return Response.json({ 
      success: true, 
      checked: allEntries.length,
      pending: pendingEntries.length,
      notifications_sent: notifications.length
    });
    
  } catch (error) {
    console.error('Error checking pending entries:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});