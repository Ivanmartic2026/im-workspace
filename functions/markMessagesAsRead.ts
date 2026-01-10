import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message_ids } = await req.json();

    if (!message_ids || !Array.isArray(message_ids)) {
      return Response.json({ error: 'message_ids array required' }, { status: 400 });
    }

    // Update all messages
    for (const messageId of message_ids) {
      const messages = await base44.entities.Message.filter({ id: messageId });
      if (messages.length > 0) {
        const message = messages[0];
        
        // Don't mark own messages as read
        if (message.sender_email === user.email) continue;

        const readBy = message.read_by || [];
        const alreadyRead = readBy.some(r => r.email === user.email);

        if (!alreadyRead) {
          readBy.push({
            email: user.email,
            name: user.full_name,
            read_at: new Date().toISOString()
          });

          await base44.entities.Message.update(messageId, {
            read_by: readBy
          });
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});