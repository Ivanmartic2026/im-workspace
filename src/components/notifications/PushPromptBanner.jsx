import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    const dismissed = localStorage.getItem('pushPromptDismissed');
    setIsDismissed(dismissed === 'true');

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

      // Wait for service worker to be ready (give it more time to register)
      const swPromise = navigator.serviceWorker.ready;
      const swTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service worker timeout - ladda om sidan och försök igen')), 20000)
      );
      const registration = await Promise.race([swPromise, swTimeout]);
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

  // Don't show if not supported, already subscribed, or dismissed
  if (!isSupported || isSubscribed || isDismissed || !user) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bell className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Aktivera notifikationer</h3>
                <p className="text-blue-50 text-sm mb-4">
                  Missa aldrig viktiga meddelanden! Aktivera push-notifikationer för att få uppdateringar direkt på din enhet.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleActivate}
                    disabled={isLoading || !vapidPublicKey}
                    className="bg-white text-blue-600 hover:bg-blue-50 shadow-md"
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
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    Senare
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}