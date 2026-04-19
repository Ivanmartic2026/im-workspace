// Automation: Send push notification when ApprovalRequest is created
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data || event.type !== 'create') {
      return Response.json({ ok: true });
    }

    const { type, requester_name, requester_email, description } = data;

    // Determine who should receive the notification
    let recipientEmail = null;
    let recipientRole = null;

    if (type === 'leave') {
      // Send to manager/approver
      const requester = await base44.asServiceRole.entities.Employee.filter({
        user_email: requester_email
      });
      if (requester.length > 0 && requester[0].manager_email) {
        recipientEmail = requester[0].manager_email;
        recipientRole = 'Manager';
      }
    } else if (type === 'time_adjustment' || type === 'overtime') {
      // Send to manager
      const requester = await base44.asServiceRole.entities.Employee.filter({
        user_email: requester_email
      });
      if (requester.length > 0 && requester[0].manager_email) {
        recipientEmail = requester[0].manager_email;
        recipientRole = 'Manager';
      }
    }

    if (!recipientEmail) {
      console.log('No recipient found for approval request');
      return Response.json({ ok: true });
    }

    const typeLabels = {
      leave: 'Semesteransökan',
      time_adjustment: 'Tidkorrigering',
      overtime: 'Övertidsrapport'
    };

    // Send push notification
    try {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        recipient_email: recipientEmail,
        title: `⏳ ${typeLabels[type] || 'Ny godkännandebegäran'}`,
        message: `${requester_name} behöver godkännande: ${description || 'Se detaljer i appen'}`,
        type: 'approval_needed',
        priority: 'high',
        action_url: '/PendingApprovals',
        related_entity_id: data.id,
        related_entity_type: 'ApprovalRequest'
      });
    } catch (pushError) {
      console.warn('Failed to send push notification:', pushError.message);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error in onApprovalRequestCreated:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});