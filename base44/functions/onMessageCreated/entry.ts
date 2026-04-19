// Automation: Send push notification when new message is created
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || event.type !== 'create') {
      return Response.json({ ok: true });
    }

    const { recipient_email, author_name, content, conversation_id } = data;

    if (!recipient_email) {
      return Response.json({ ok: true });
    }

    // Truncate message for notification
    const messagePreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');

    try {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        recipient_email,
        title: `💬 Nytt meddelande från ${author_name}`,
        message: messagePreview,
        type: 'message',
        priority: 'normal',
        action_url: '/Chat',
        related_entity_id: conversation_id,
        related_entity_type: 'Message'
      });
    } catch (pushError) {
      console.warn('Failed to send push notification:', pushError.message);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error in onMessageCreated:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});