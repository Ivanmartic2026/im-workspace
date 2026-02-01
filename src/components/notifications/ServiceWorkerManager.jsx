import { useEffect } from 'react';

export default function ServiceWorkerManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Create service worker as a blob
      const swCode = `
        self.addEventListener('push', event => {
          if (!event.data) return;
          try {
            const data = event.data.json();
            const options = {
              body: data.body || 'Du har ett nytt meddelande',
              icon: '/icon-192.png',
              badge: '/badge-72.png',
              tag: data.tag || 'notification',
              requireInteraction: data.requireInteraction || false
            };
            if (data.image) options.image = data.image;
            event.waitUntil(self.registration.showNotification(data.title || 'Meddelande', options));
          } catch (err) {
            console.error('Push event error:', err);
          }
        });
        
        self.addEventListener('notificationclick', event => {
          event.notification.close();
          event.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
            for (let client of list) {
              if (client.url === '/' && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
          }));
        });
      `;
      
      const blob = new Blob([swCode], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(blob);
      
      navigator.serviceWorker.register(swUrl).catch(err => {
        console.error('Service Worker registration failed:', err);
      });
    }
  }, []);

  return null;
}