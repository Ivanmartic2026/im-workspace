// Automation: Send push when time entry anomalies detected
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!data || event.type !== 'update') {
      return Response.json({ ok: true });
    }

    const { anomaly_flag, anomaly_reason, employee_email, total_hours, status } = data;
    const wasNotAnomalous = !old_data?.anomaly_flag;

    // Trigger when anomaly is detected
    if (anomaly_flag && wasNotAnomalous) {
      let title = '⚠️ Avvikelse i tidsrapport';
      let message = anomaly_reason || 'Din tidsrapport innehåller en avvikelse som behöver granskas.';

      // Handle specific anomaly types
      if (anomaly_reason?.includes('glömt')) {
        title = '⏰ Du glömde stämpla ut';
        message = 'Du verkar ha glömt att stämpla ut idag. Korrigera snart för att undvika problem.';
      } else if (anomaly_reason?.includes('Övertid')) {
        title = '⚡ Övertidsvarning';
        message = `Du har överskridit arbetsdagen. Arbetsad: ${total_hours}h.`;
      } else if (anomaly_reason?.includes('rast')) {
        title = '🍽️ Rastmissning';
        message = 'Du verkar ha missad den obligatoriska rasten.';
      }

      try {
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          recipient_email: employee_email,
          title,
          message,
          type: 'time_correction_needed',
          priority: 'high',
          action_url: '/TimeTracking',
          related_entity_id: data.id,
          related_entity_type: 'TimeEntry'
        });
      } catch (pushError) {
        console.warn('Failed to send push notification:', pushError.message);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Error in onTimeEntryAnomaly:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});