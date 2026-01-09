import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.6';

// Configure Web Push with VAPID keys (set these as environment variables)
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEo4ZwIJXD-viFr8w_h8yK-nXfpjG7XdLbwNLEqKS0g0SqxJN8F6D3U5Vc5y1u4cJ9Gu4K2QpL9N8rT7v5Y8';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'demo-private-key';
const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:test@example.com';

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { recipient_email, title, message, type = 'system', action_url, priority = 'normal', notificationId } = await req.json();

    if (!recipient_email || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Admin-only or self-owned
    if (user.role !== 'admin' && user.email !== recipient_email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch user's push subscriptions
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email: recipient_email,
      is_active: true
    });

    if (subscriptions.length === 0) {
      console.log(`No active push subscriptions for ${recipient_email}`);
      return Response.json({ 
        success: false, 
        message: 'No active push subscriptions',
        subscriptionCount: 0 
      });
    }

    // Get unread count for badge
    const unreadNotifications = await base44.asServiceRole.entities.Notification.filter({
      recipient_email: recipient_email,
      is_read: false
    });
    const unreadCount = unreadNotifications.length + 1;

    // Prepare push notification payload
    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: type,
      notificationId,
      action_url,
      type,
      priority,
      unreadCount,
      timestamp: new Date().toISOString()
    });

    // Send to all subscriptions
    const results = {
      successful: 0,
      failed: 0,
      errors: [],
      subscriptionCount: subscriptions.length
    };

    for (const subscription of subscriptions) {
      try {
        // Reconstruct subscription object for web-push
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        };

        // Send push notification
        await webpush.sendNotification(pushSubscription, payload);
        results.successful++;

        console.log(`Push sent to ${subscription.device_name || 'unknown'} (${subscription.browser})`);
      } catch (error) {
        results.failed++;
        
        // If subscription is invalid, mark as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(subscription.id, {
            is_active: false
          });
          console.log(`Removed invalid subscription: ${subscription.endpoint}`);
        }

        results.errors.push({
          endpoint: subscription.endpoint,
          error: error.message,
          statusCode: error.statusCode
        });
      }
    }

    // Also save notification to database
    try {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email,
        type,
        title,
        message,
        priority,
        action_url,
        sent_via: ['push'],
        related_entity_id: notificationId,
        related_entity_type: 'PushNotification'
      });
    } catch (error) {
      console.error('Error saving notification to database:', error.message);
    }

    return Response.json({
      success: results.successful > 0,
      message: `Sent to ${results.successful} device(s)`,
      results,
      vapidPublicKey
    });
  } catch (error) {
    console.error('Error in sendWebPushNotification:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});