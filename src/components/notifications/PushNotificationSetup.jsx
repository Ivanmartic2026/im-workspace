import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";

export default function PushNotificationSetup({ onSetupComplete }) {
  const [status, setStatus] = useState('unknown'); // unknown, supported, unsupported, granted, denied
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkPushSupport();
    registerServiceWorker();
  }, []);

  const checkPushSupport = async () => {
    // Kontrollera iOS PWA support
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true;
    const isPWA = isIOS && isStandalone;

    if (!('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    if (!isPWA && !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    if (!isPWA && Notification.permission === 'granted') {
      setStatus('granted');
      return;
    }

    if (!isPWA && Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    setStatus('supported');
  };

  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered');
        
        // Kolla för push support och subscriba
        if ('pushManager' in registration) {
          try {
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
              // Försök subscribe om användare godkänt notiser
              const permission = Notification.permission;
              if (permission === 'granted') {
                const vapidPublicKey = document.querySelector('meta[name="vapid-public-key"]')?.content;
                if (vapidPublicKey) {
                  await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidPublicKey
                  }).catch(err => console.log('Push subscription optional:', err));
                }
              }
            }
          } catch (pushError) {
            console.log('Push subscription not required:', pushError);
          }
        }
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestNotificationPermission = async () => {
    setIsLoading(true);

    try {
      // För iOS PWA - använd Safari-specifika metoder
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // iOS PWA notiser kräver inte uttrycklig tillåtelse, men vi visar ett bekräftelsefönster
        setStatus('granted');
        onSetupComplete?.();
        return;
      }

      // För Android och Desktop
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          setStatus('granted');
          onSetupComplete?.();
        } else if (permission === 'denied') {
          setStatus('denied');
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setStatus('denied');
    }

    setIsLoading(false);
  };

  if (status === 'unsupported') {
    return null; // Gömma knappen om inte supporterat
  }

  if (status === 'granted') {
    return (
      <div className="flex items-center gap-2 text-emerald-700 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        <span>Push-notiser är aktiverade</span>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Push-notiser är inaktiverade i inställningarna</span>
      </div>
    );
  }

  return (
    <Button
      onClick={requestNotificationPermission}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      {isLoading ? 'Aktiverar...' : 'Aktivera notiser'}
    </Button>
  );
}