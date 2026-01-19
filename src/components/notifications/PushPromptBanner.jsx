import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function PushPromptBanner({ user }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pushPromptDismissed');
    setIsDismissed(dismissed === 'true');

    // Check if mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(isMobileDevice);

    const supported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    setIsSupported(supported);

    if (supported && user) {
      checkSubscription();
      loadVapidKey();
    }
  }, [user]);

  const loadVapidKey = async () => {
    try {
      const response = await base44.functions.invoke('getVapidPublicKey');
      if (response.data?.publicKey) {
        setVapidPublicKey(response.data.publicKey);
      }
    } catch (err) {
      console.error('Error loading VAPID key:', err);
    }
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const getBrowserName = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  };

  const getDeviceName = () => {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      return 'Mobile';
    }
    return 'Desktop';
  };

  const handleActivate = async () => {
    if (!vapidPublicKey) {
      alert('Systemet är inte redo än. Vänta ett ögonblick och försök igen.');
      return;
    }

    // Check if iOS and not in standalone mode (not installed as PWA)
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    
    if (isIOS && !isStandalone) {
      alert('På iOS måste du först lägga till appen på hemskärmen:\n\n1. Tryck på delningsikonen\n2. Välj "Lägg till på hemskärmen"\n3. Öppna appen från hemskärmen\n4. Aktivera push-notiser därifrån');
      return;
    }

    setIsLoading(true);

    try {
      console.log('1. Begär notifikationsbehörighet...');
      
      // Request notification permission with timeout
      const permissionPromise = Notification.requestPermission();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout - tog för lång tid')), 10000)
      );
      
      const permission = await Promise.race([permissionPromise, timeoutPromise]);
      console.log('2. Behörighet:', permission);
      
      if (permission !== 'granted') {
        throw new Error('Du måste tillåta notifikationer');
      }

      console.log('3. Väntar på service worker...');

      // Get existing registration or wait for ready
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log('Waiting for service worker to be ready...');
        registration = await navigator.serviceWorker.ready;
      }
      console.log('4. Service worker redo:', registration);

      console.log('5. Skapar push-prenumeration...');
      const subPromise = registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      const subTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Push subscription timeout')), 10000)
      );
      const subscription = await Promise.race([subPromise, subTimeout]);
      console.log('6. Prenumeration skapad');

      // Store in database
      console.log('7. Sparar i databas...');
      const keys = subscription.getKey('auth');
      const p256dh = subscription.getKey('p256dh');
      
      await base44.entities.PushSubscription.create({
        user_email: user?.email,
        endpoint: subscription.endpoint,
        auth_key: keys ? btoa(String.fromCharCode.apply(null, new Uint8Array(keys))) : '',
        p256dh_key: p256dh ? btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh))) : '',
        browser: getBrowserName(),
        device_name: getDeviceName()
      });
      console.log('8. Sparat!');

      setIsSubscribed(true);
      setIsDismissed(true);
      localStorage.setItem('pushPromptDismissed', 'true');
      
      new Notification('Push-notifikationer aktiverade! 🎉', {
        body: 'Du kommer nu att få notifikationer även när appen är stängd.',
        icon: '/icon-192.png'
      });
      
      alert('✓ Push-notifikationer aktiverade!');
    } catch (err) {
      console.error('ERROR:', err);
      alert(`Fel: ${err.message || 'Kunde inte aktivera'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pushPromptDismissed', 'true');
  };

  // Don't show if not supported, already subscribed, dismissed, not mobile, or no user
  if (!isSupported || isSubscribed || isDismissed || !user || !isMobile) {
    return null;
  }

  return (
    <Dialog open={!isDismissed && isSupported && !isSubscribed && user && isMobile} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-sm rounded-2xl border-0 shadow-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <Bell className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">Aktivera notifikationer</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 text-center">
          <p className="text-blue-50 text-sm">
            Missa aldrig viktiga meddelanden! Aktivera push-notifikationer för att få uppdateringar direkt på din enhet.
          </p>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleActivate}
              disabled={isLoading || !vapidPublicKey}
              className="flex-1 bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aktiverar...
                </>
              ) : !vapidPublicKey ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Laddar...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Aktivera nu
                </>
              )}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="flex-1 text-white border-white/30 hover:bg-white/10 font-semibold"
            >
              Senare
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}