import { useEffect } from 'react';

export default function ServiceWorkerManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Create and register service worker inline
      const registerSW = async () => {
        try {
          // Create service worker code as data URL instead of blob
          const swCode = `
// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('SW installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW activating...');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  let data = {
    title: 'Ny notis',
    body: 'Du har en ny notifikation',
    icon: '/logo.png'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.message,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/badge.png',
    tag: data.tag || 'default',
    requireInteraction: data.priority === 'high' || data.priority === 'urgent',
    data: {
      url: data.action_url || '/',
      notificationId: data.notificationId
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
`;

          // Use data URL instead of blob
          const dataUrl = `data:application/javascript;base64,${btoa(swCode)}`;
          
          const registration = await navigator.serviceWorker.register(dataUrl, {
            scope: '/'
          });
          
          console.log('✅ Service Worker registered:', registration);
        } catch (error) {
          console.error('❌ Service Worker registration failed:', error);
        }
      };

      registerSW();
    }
  }, []);

  return null;
}