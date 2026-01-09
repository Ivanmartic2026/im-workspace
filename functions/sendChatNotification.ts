import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      recipient_email, 
      sender_name, 
      message_content, 
      conversation_id,
      message_id 
    } = await req.json();

    if (!recipient_email || !sender_name || !message_content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification in database
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email,
      type: 'chat',
      title: 'Nytt chattmeddelande',
      message: `${sender_name}: ${message_content.substring(0, 80)}${message_content.length > 80 ? '...' : ''}`,
      priority: 'normal',
      is_read: false,
      related_entity_id: message_id,
      related_entity_type: 'Message',
      sent_via: ['app', 'push']
    });

    // Send push notification
    try {
      await base44.asServiceRole.functions.invoke('sendWebPushNotification', {
        recipient_email,
        title: 'Nytt chattmeddelande',
        message: `${sender_name}: ${message_content.substring(0, 80)}${message_content.length > 80 ? '...' : ''}`,
        type: 'chat',
        priority: 'normal',
        action_url: `/chat?conversation=${conversation_id}`,
        notificationId: notification.id
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }

    return Response.json({ 
      success: true,
      notification_id: notification.id 
    });
  } catch (error) {
    console.error('Error in sendChatNotification:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});