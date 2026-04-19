// Automation: Send push notification when LeaveRequest status changes
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data || event.type !== 'update' || !old_data) {
      return Response.json({ ok: true });
    }

    // Only trigger on status change
    if (data.status === old_data.status) {
      return Response.json({ ok: true });
    }

    const { status, type, employee_email, days } = data;

    if (status === 'approved') {
      try {
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          recipient_email: employee_email,
          title: '✅ Din ansökan godkänd',
          message: `Din ${type === 'semester' ? 'semesteransökan' : 'frånvarobegäran'} för ${days} dag(ar) har godkänts.`,
          type: 'approved',
          priority: 'high',
          action_url: '/Leave',
          related_entity_id: data.id,
          related_entity_type: 'LeaveRequest'
        });
      } catch (pushError) {
        console.warn('Failed to send push notification:', pushError.message);
      }
    } else if (status === 'rejected') {
      try {
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          recipient_email: employee_email,
          title: '❌ Din ansökan avslagen',
          message: `Din ${type === 'semester' ? 'semesteransökan' : 'frånvarobegäran'} har avslåtts. Kontakta din chef för mer information.`,
          type: 'rejected',
          priority: 'high',
          action_url: '/Leave',
          related_entity_id: data.id,
          related_entity_type: 'LeaveRequest'
        });
      } catch (pushError) {
        console.warn('Failed to send push notification:', pushError.message);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error in onLeaveRequestStatusChange:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});