import { useEffect } from 'react';

export default function ServiceWorkerManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    }
  }, []);

  return null;
}