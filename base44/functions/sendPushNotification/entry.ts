import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      recipient_email,
      title,
      message,
      action_url,
      type,
      priority = 'normal',
      related_entity_id,
      related_entity_type
    } = await req.json();

    if (!recipient_email || !title || !message || !type) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only admin or system can send push, or if recipient is self
    if (user.role !== 'admin' && user.email !== recipient_email) {
      return Response.json(
        { error: 'Forbidden: Can only send to yourself' },
        { status: 403 }
      );
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      );
    }

    // Set VAPID details
    webpush.setVapidDetails(
      'mailto:admin@imvision.se',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Fetch active subscriptions for recipient
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email: recipient_email,
      is_active: true
    });

    if (subscriptions.length === 0) {
      console.log(`No active push subscriptions for ${recipient_email}`);
    }

    // Prepare push payload
    const payload = JSON.stringify({
      title,
      message,
      type,
      priority,
      action_url: action_url || '/',
      tag: `${type}-${Date.now()}`,
      timestamp: new Date().toISOString()
    });

    let successCount = 0;
    const failedSubscriptions = [];

    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key,
            p256dh: sub.p256dh_key
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (error) {
        // Check if endpoint is expired (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedSubscriptions.push(sub.id);
        } else {
          console.error(`Failed to send push to ${sub.endpoint}:`, error.message);
        }
      }
    }

    // Deactivate failed subscriptions
    for (const subId of failedSubscriptions) {
      await base44.asServiceRole.entities.PushSubscription.update(subId, {
        is_active: false
      });
    }

    // Create Notification record in database
    const notificationData = {
      recipient_email,
      type,
      title,
      message,
      priority,
      is_read: false,
      sent_via: ['push', 'app']
    };

    if (related_entity_id) {
      notificationData.related_entity_id = related_entity_id;
    }
    if (related_entity_type) {
      notificationData.related_entity_type = related_entity_type;
    }
    if (action_url) {
      notificationData.action_url = action_url;
    }

    await base44.asServiceRole.entities.Notification.create(notificationData);

    return Response.json({
      success: true,
      sent: successCount,
      failed: failedSubscriptions.length,
      message: `Notification sent to ${successCount} device(s)`
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});