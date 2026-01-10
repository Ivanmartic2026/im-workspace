import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id, is_typing } = await req.json();

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id required' }, { status: 400 });
    }

    // Get conversation
    const conversation = await base44.entities.Conversation.filter({ id: conversation_id });
    if (!conversation || conversation.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = conversation[0];
    let typingUsers = conv.typing_users || [];

    if (is_typing) {
      // Add user to typing list if not already there
      if (!typingUsers.some(tu => tu.email === user.email)) {
        typingUsers.push({
          email: user.email,
          name: user.full_name,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Remove user from typing list
      typingUsers = typingUsers.filter(tu => tu.email !== user.email);
    }

    // Update conversation
    await base44.entities.Conversation.update(conversation_id, {
      typing_users: typingUsers
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating typing status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});