import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, icon, badge, tag, data } = await req.json();

    if (!title || !body) {
      return Response.json({ error: 'Title and body required' }, { status: 400 });
    }

    // Skapa notifikation i databasen för senare leverans
    const notification = {
      recipient_email: user.email,
      type: 'system',
      title,
      message: body,
      priority: 'normal',
      is_read: false
    };

    if (data?.related_entity_id) {
      notification.related_entity_id = data.related_entity_id;
      notification.related_entity_type = data.related_entity_type;
    }

    await base44.asServiceRole.entities.Notification.create(notification);

    return Response.json({ 
      success: true,
      message: 'Notification created and will be pushed to devices'
    });
  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});