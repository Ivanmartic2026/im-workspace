import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { title, message, icon, badge, tag } = await req.json();

    if (!title || !message) {
      return Response.json({ error: 'Missing title or message' }, { status: 400 });
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list();
    
    // Create notification records for each user
    const notifications = users.map(u => ({
      recipient_email: u.email,
      type: 'system',
      title: title,
      message: message,
      priority: 'normal',
      is_read: false,
      sent_via: ['push']
    }));

    // Bulk create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({
      success: true,
      notificationsSent: notifications.length,
      message: `Push notification sent to ${notifications.length} users`
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});