import { useEffect } from 'react';

export default function ServiceWorkerManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Registrera service worker för push-notiser och offline-stöd
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrerad:', registration.scope);
        })
        .catch(err => {
          console.error('Service Worker registrering misslyckades:', err);
        });
    }
  }, []);

  return null;
}