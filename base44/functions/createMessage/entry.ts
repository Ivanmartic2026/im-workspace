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

    // Get conversation to find all participants
    const conversation = await base44.asServiceRole.entities.Conversation.filter(
      { id: conversation_id },
      null,
      1
    );

    if (!conversation || conversation.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = conversation[0];
    const participants = conv.participants || [];

    // Create the message
    const message = await base44.asServiceRole.entities.Message.create({
      conversation_id,
      sender_email: user.email,
      sender_name: user.full_name,
      content,
      is_read: false,
      read_by: [user.email]
    });

    // Send notifications to all other participants
    for (const participantEmail of participants) {
      if (participantEmail !== user.email) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: participantEmail,
          type: 'chat',
          title: 'Nytt chattmeddelande',
          message: `${user.full_name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          priority: 'normal',
          is_read: false,
          related_entity_id: message.id,
          related_entity_type: 'Message',
          sent_via: ['app', 'push']
        });
      }
    }

    // Update conversation with last message
    await base44.asServiceRole.entities.Conversation.update(conversation_id, {
      last_message: content,
      last_message_at: new Date().toISOString(),
      last_message_by: user.email
    });

    return Response.json({ success: true, message });
  } catch (error) {
    console.error('Error creating message:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});