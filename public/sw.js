// Service Worker för Personalhantering PWA

const CACHE_NAME = 'personalhantering-v1';

// Installera service worker
self.addEventListener('install', event => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Aktivera service worker
self.addEventListener('activate', event => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Hantera push-notifikationer
self.addEventListener('push', event => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Du har ett nytt meddelande',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: {
        url: data.url || '/'
      }
    };

    if (data.image) {
      options.image = data.image;
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Personalhantering', options)
    );
  } catch (err) {
    console.error('Push event error:', err);
  }
});

// Hantera klick på notifikation
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Försök hitta ett öppet fönster och fokusera det
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Öppna nytt fönster om inget finns
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Hantera bakgrundssynk (för offline-stöd i framtiden)
self.addEventListener('sync', event => {
  console.log('Background sync:', event.tag);
});
