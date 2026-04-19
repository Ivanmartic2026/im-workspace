// Service Worker for Push Notifications

// Handle push events
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.message || '',
    icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6951895d1643f7057890a865/daf37ea55_LogoLIGGANDE_IMvision_svartkopiaepskopia2.png',
    badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6951895d1643f7057890a865/daf37ea55_LogoLIGGANDE_IMvision_svartkopiaepskopia2.png',
    tag: data.tag || 'notification',
    data: {
      action_url: data.action_url || '/',
      timestamp: Date.now()
    },
    requireInteraction: data.priority === 'urgent' || data.priority === 'high',
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Öppna'
      },
      {
        action: 'close',
        title: 'Stäng'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'IM Workspace', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const actionUrl = event.notification.data.action_url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Look for existing window
      for (let client of clientList) {
        if (client.url === actionUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  // Optional: track dismissals in analytics
  console.log('Notification closed:', event.notification.tag);
});

// Background sync (optional future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/sync-notifications')
        .catch((err) => console.error('Background sync failed:', err))
    );
  }
});
