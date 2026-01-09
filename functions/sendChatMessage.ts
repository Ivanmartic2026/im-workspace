import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id, content } = await req.json();

    if (!conversation_id || !content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create message
    const message = await base44.entities.Message.create({
      conversation_id,
      sender_email: user.email,
      sender_name: user.full_name,
      content,
      is_read: false,
      read_by: [user.email]
    });

    // Update conversation
    await base44.entities.Conversation.update(conversation_id, {
      last_message: content,
      last_message_at: new Date().toISOString(),
      last_message_by: user.email
    });

    // Get conversation participants
    const conversations = await base44.entities.Conversation.filter({ id: conversation_id }, null, 1);
    
    if (conversations.length > 0) {
      const participants = conversations[0].participants || [];
      
      // Send notifications to all participants except sender
      for (const participantEmail of participants) {
        if (participantEmail !== user.email) {
          // Create notification in database
          const notification = await base44.asServiceRole.entities.Notification.create({
            recipient_email: participantEmail,
            type: 'chat',
            title: 'Nytt chattmeddelande',
            message: `${user.full_name}: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`,
            priority: 'normal',
            is_read: false,
            related_entity_id: message.id,
            related_entity_type: 'Message',
            sent_via: ['app', 'push']
          });

          // Send push notification
          try {
            await base44.asServiceRole.functions.invoke('sendWebPushNotification', {
              recipient_email: participantEmail,
              title: 'Nytt chattmeddelande',
              message: `${user.full_name}: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`,
              type: 'chat',
              priority: 'normal',
              action_url: `/chat?conversation=${conversation_id}`,
              notificationId: notification.id
            });
            console.log(`Push notification sent to ${participantEmail}`);
          } catch (error) {
            console.error(`Failed to send push notification to ${participantEmail}:`, error);
          }
        }
      }
    }

    return Response.json({ 
      success: true,
      message 
    });
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});