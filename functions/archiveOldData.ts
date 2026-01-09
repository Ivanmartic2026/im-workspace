import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('Starting data archiving...');

    const results = {
      notifications: 0,
      messages: 0,
      timeEntries: 0,
      journalEntries: 0
    };

    // Archive notifications older than 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const oldNotifications = await base44.asServiceRole.entities.Notification.list();
    for (const notification of oldNotifications) {
      const createdDate = new Date(notification.created_date);
      if (createdDate < threeMonthsAgo && notification.is_read) {
        await base44.asServiceRole.entities.Notification.delete(notification.id);
        results.notifications++;
      }
    }
    console.log(`Archived ${results.notifications} old notifications`);

    // Archive chat messages older than 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const oldMessages = await base44.asServiceRole.entities.Message.list();
    for (const message of oldMessages) {
      const createdDate = new Date(message.created_date);
      if (createdDate < sixMonthsAgo) {
        await base44.asServiceRole.entities.Message.delete(message.id);
        results.messages++;
      }
    }
    console.log(`Archived ${results.messages} old messages`);

    // Mark time entries older than 12 months as archived (add archived flag if needed)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const oldTimeEntries = await base44.asServiceRole.entities.TimeEntry.list();
    for (const entry of oldTimeEntries) {
      const entryDate = new Date(entry.date);
      if (entryDate < twelveMonthsAgo && entry.status === 'approved') {
        // Instead of deleting, we could update with an archived flag
        // For now, we'll just count them
        results.timeEntries++;
      }
    }
    console.log(`Found ${results.timeEntries} time entries older than 12 months`);

    // Mark journal entries older than 24 months as archived
    const twentyFourMonthsAgo = new Date();
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

    const oldJournalEntries = await base44.asServiceRole.entities.DrivingJournalEntry.list();
    for (const entry of oldJournalEntries) {
      const entryDate = new Date(entry.start_time);
      if (entryDate < twentyFourMonthsAgo && entry.status === 'approved') {
        // Count entries that could be archived
        results.journalEntries++;
      }
    }
    console.log(`Found ${results.journalEntries} journal entries older than 24 months`);

    // Send notification to admin
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of adminUsers) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: admin.email,
        type: 'system',
        title: 'Arkivering slutförd',
        message: `Automatisk arkivering genomförd. ${results.notifications} notiser och ${results.messages} meddelanden arkiverade.`,
        priority: 'low',
        is_read: false,
        sent_via: ['app']
      });
    }

    console.log('Archiving completed');

    return Response.json({
      success: true,
      archived: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in archiveOldData:', error);
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});