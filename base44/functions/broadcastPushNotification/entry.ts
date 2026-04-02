import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.6';

// Configure Web Push
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEo4ZwIJXD-viFr8w_h8yK-nXfpjG7XdLbwNLEqKS0g0SqxJN8F6D3U5Vc5y1u4cJ9Gu4K2QpL9N8rT7v5Y8';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'demo-private-key';
const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:test@example.com';

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can broadcast
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { title, message, target_departments = [], type = 'system', priority = 'normal' } = await req.json();

    if (!title || !message) {
      return Response.json({ error: 'Missing title or message' }, { status: 400 });
    }

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Filter by departments if specified
    let targetUsers = allUsers;
    if (target_departments && target_departments.length > 0) {
      const employees = await base44.asServiceRole.entities.Employee.list();
      const employeesByDept = employees.filter(e => target_departments.includes(e.department));
      const targetEmails = employeesByDept.map(e => e.user_email);
      targetUsers = allUsers.filter(u => targetEmails.includes(u.email));
    }

    console.log(`Broadcasting to ${targetUsers.length} users`);

    // Get all push subscriptions for target users
    const allSubscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      is_active: true
    });

    const targetSubscriptions = allSubscriptions.filter(sub =>
      targetUsers.some(u => u.email === sub.user_email)
    );

    if (targetSubscriptions.length === 0) {
      return Response.json({
        success: false,
        message: 'No active push subscriptions in target group',
        targetUserCount: targetUsers.length,
        subscriptionCount: 0
      });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: type,
      type,
      priority,
      timestamp: new Date().toISOString()
    });

    // Send to all subscriptions
    const results = {
      successful: 0,
      failed: 0,
      totalSubscriptions: targetSubscriptions.length,
      failedEndpoints: []
    };

    for (const subscription of targetSubscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        results.successful++;
      } catch (error) {
        results.failed++;

        if (error.statusCode === 410 || error.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(subscription.id, {
            is_active: false
          });
        }

        results.failedEndpoints.push({
          device: subscription.device_name,
          browser: subscription.browser,
          error: error.message
        });
      }
    }

    // Save broadcast notification to database
    try {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: 'broadcast@system',
        type: 'broadcast',
        title,
        message,
        priority,
        sent_via: ['push']
      });
    } catch (error) {
      console.error('Error saving broadcast notification:', error.message);
    }

    return Response.json({
      success: results.successful > 0,
      message: `Broadcast sent to ${results.successful}/${results.totalSubscriptions} devices`,
      results
    });
  } catch (error) {
    console.error('Error in broadcastPushNotification:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});