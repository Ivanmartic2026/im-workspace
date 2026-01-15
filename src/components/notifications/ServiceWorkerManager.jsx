import { useEffect } from 'react';

export default function ServiceWorkerManager() {
  useEffect(() => {
    // Service Worker is not supported in Base44 platform currently
    // Disabled to prevent console errors
    return;
  }, []);

  return null;
}