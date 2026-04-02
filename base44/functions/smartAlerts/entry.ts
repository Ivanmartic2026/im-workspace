import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled calls (no user) or admin calls
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      // No user = scheduled/automated call, allow it
      isScheduled = true;
    }

    // Load config from a special entity record (key = "smart_alerts_config")
    const allSettings = await base44.asServiceRole.entities.NotificationSettings.list();
    const configRecord = allSettings.find(s => s.setting_key === 'smart_alerts_config');
    const config = configRecord?.setting_value || {};

    const clockOutHours = config.clock_out_hours ?? 10;
    const budgetWarningPct = config.budget_warning_pct ?? 80;
    const budgetCriticalPct = config.budget_critical_pct ?? 100;
    const minDailyHours = config.min_daily_hours ?? 4;
    const checkMissingHours = config.check_missing_hours ?? true;
    const checkClockOut = config.check_clock_out ?? true;
    const checkBudget = config.check_budget ?? true;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    // Yesterday (for missing hours check)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [allEntries, allUsers, allProjects] = await Promise.all([
      base44.asServiceRole.entities.TimeEntry.list(),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Project.list(),
    ]);

    const notifications = [];
    const results = { clock_out: 0, budget: 0, missing_hours: 0 };

    // ---- 1. CLOCK OUT REMINDERS ----
    if (checkClockOut) {
      const activeEntries = allEntries.filter(e => e.status === 'active' && e.clock_in_time);
      for (const entry of activeEntries) {
        const hoursIn = (now - new Date(entry.clock_in_time)) / (1000 * 60 * 60);
        if (hoursIn >= clockOutHours) {
          // Check if we already sent this notification today
          const alreadySent = allEntries.find(e =>
            e.employee_email === entry.employee_email &&
            e.date === todayStr
          );
          // Create notification for employee
          notifications.push({
            recipient_email: entry.employee_email,
            type: 'forgot_clock_out',
            title: '⏰ Kom ihåg att stämpla ut',
            message: `Du har varit instämplad i ${Math.floor(hoursIn)} timmar. Glöm inte att stämpla ut!`,
            priority: 'high',
            is_read: false,
            sent_via: ['app'],
            related_entity_id: entry.id,
            related_entity_type: 'TimeEntry'
          });
          results.clock_out++;
        }
      }
    }

    // ---- 2. PROJECT BUDGET ALERTS ----
    if (checkBudget) {
      const activeProjects = allProjects.filter(p => p.status === 'pågående' && p.budget_hours);
      for (const project of activeProjects) {
        // Sum all logged hours for this project
        let totalHours = 0;
        for (const entry of allEntries) {
          if (entry.project_allocations) {
            for (const alloc of entry.project_allocations) {
              if (alloc.project_id === project.id) {
                totalHours += alloc.hours || 0;
              }
            }
          }
        }
        const pct = (totalHours / project.budget_hours) * 100;
        const admins = allUsers.filter(u => u.role === 'admin');

        if (pct >= budgetCriticalPct) {
          for (const admin of admins) {
            notifications.push({
              recipient_email: admin.email,
              type: 'system',
              title: `🚨 Budget överskriden: ${project.name}`,
              message: `Projekt "${project.name}" har förbrukat ${totalHours.toFixed(1)}h av ${project.budget_hours}h budget (${pct.toFixed(0)}%).`,
              priority: 'urgent',
              is_read: false,
              sent_via: ['app'],
              related_entity_id: project.id,
              related_entity_type: 'Project'
            });
          }
          results.budget++;
        } else if (pct >= budgetWarningPct) {
          for (const admin of admins) {
            notifications.push({
              recipient_email: admin.email,
              type: 'system',
              title: `⚠️ Budget varning: ${project.name}`,
              message: `Projekt "${project.name}" har förbrukat ${totalHours.toFixed(1)}h av ${project.budget_hours}h budget (${pct.toFixed(0)}%). Snart fullt!`,
              priority: 'high',
              is_read: false,
              sent_via: ['app'],
              related_entity_id: project.id,
              related_entity_type: 'Project'
            });
          }
          results.budget++;
        }
      }
    }

    // ---- 3. MISSING HOURS ALERT ----
    // Check if yesterday was a weekday (Mon-Fri)
    if (checkMissingHours) {
      const dayOfWeek = yesterday.getDay(); // 0=Sun, 6=Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const admins = allUsers.filter(u => u.role === 'admin');
        const missingEmployees = [];

        for (const user of allUsers) {
          const userEntries = allEntries.filter(e => e.employee_email === user.email && e.date === yesterdayStr);
          const totalHours = userEntries
            .filter(e => e.status === 'completed')
            .reduce((s, e) => s + (e.total_hours || 0), 0);

          if (totalHours < minDailyHours && userEntries.length === 0) {
            missingEmployees.push(user.full_name || user.email);
          }
        }

        if (missingEmployees.length > 0) {
          for (const admin of admins) {
            notifications.push({
              recipient_email: admin.email,
              type: 'time_correction_needed',
              title: `📋 Saknade tidrapporter (${yesterdayStr})`,
              message: `Följande medarbetare har inga timmar rapporterade igår: ${missingEmployees.join(', ')}.`,
              priority: 'normal',
              is_read: false,
              sent_via: ['app']
            });
          }
          results.missing_hours = missingEmployees.length;
        }
      }
    }

    // Bulk create all notifications
    for (const n of notifications) {
      await base44.asServiceRole.entities.Notification.create(n);
    }

    return Response.json({
      success: true,
      sent: notifications.length,
      results
    });

  } catch (error) {
    console.error('smartAlerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});