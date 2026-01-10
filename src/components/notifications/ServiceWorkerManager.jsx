import { useEffect } from 'react';

const serviceWorkerCode = `
// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'Ny notis',
    body: 'Du har en ny notifikation',
    icon: '/logo.png',
    badge: '/badge.png',
    tag: 'notification'
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body || notificationData.message,
    icon: notificationData.icon || '/logo.png',
    badge: notificationData.badge || '/badge.png',
    tag: notificationData.tag || 'default',
    requireInteraction: notificationData.priority === 'high' || notificationData.priority === 'urgent',
    data: {
      url: notificationData.action_url || '/',
      notificationId: notificationData.notificationId,
      unreadCount: notificationData.unreadCount || 1
    }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title, options),
      // Update badge with unread count
      navigator.setAppBadge ? navigator.setAppBadge(notificationData.unreadCount || 1) : Promise.resolve()
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Clear badge when notification is clicked
      if (navigator.clearAppBadge) {
        navigator.clearAppBadge();
      }
      
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
`;

export default function ServiceWorkerManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Create blob URL from service worker code
        const blob = new Blob([serviceWorkerCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);

        navigator.serviceWorker.register(swUrl)
          .then((registration) => {
            console.log('✅ Service Worker registered successfully:', registration);
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}