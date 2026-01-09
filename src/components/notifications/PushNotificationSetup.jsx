import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, AlertCircle, Loader2, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

export default function PushNotificationSetup({ user }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);

  useEffect(() => {
    // Check browser support
    const supported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    setIsSupported(supported);

    if (supported && user) {
      loadVapidKey();
      checkSubscription();
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
      setError('Kunde inte ladda push-notifikationskonfiguration');
    }
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setIsSubscribed(true);
        setSubscription(subscription);
        await verifySubscriptionInDB(subscription);
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setError('Kunde inte kontrollera prenumerationsstatus');
    }
  };

  const verifySubscriptionInDB = async (subscription) => {
    try {
      const subscriptions = await base44.entities.PushSubscription.filter(
        { 
          user_email: user?.email,
          endpoint: subscription.endpoint
        }
      );
      
      if (subscriptions.length === 0) {
        // Store subscription if not already in DB
        await storePushSubscription(subscription);
      }
    } catch (err) {
      console.error('Error verifying subscription:', err);
    }
  };

  const storePushSubscription = async (subscription) => {
    try {
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
    } catch (err) {
      console.error('Error storing subscription:', err);
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

  const handleSubscribe = async () => {
    if (!vapidPublicKey) {
      setError('VAPID-nyckel inte tillgänglig ännu. Vänta ett ögonblick och försök igen.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Push-notifikationsbehörighet inte beviljad');
        }
      }

      if (Notification.permission !== 'granted') {
        throw new Error('Push-notifikationsbehörighet krävs för att fortsätta');
      }

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Store in database
      await storePushSubscription(subscription);
      setSubscription(subscription);
      setIsSubscribed(true);
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Kunde inte aktivera push-notifikationer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);

    try {
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      if (subscription) {
        const subscriptions = await base44.entities.PushSubscription.filter({
          user_email: user?.email,
          endpoint: subscription.endpoint
        });

        for (const sub of subscriptions) {
          await base44.entities.PushSubscription.update(sub.id, { is_active: false });
        }
      }

      setIsSubscribed(false);
      setSubscription(null);
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError('Kunde inte avsluta prenumeration');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-0 shadow-sm bg-amber-50 border-l-4 border-amber-500">
        <CardContent className="p-4">
          <p className="text-sm text-amber-900">
            Din webbläsare stöder inte push-notifikationer. Använd Chrome, Firefox, Edge eller senare versioner av Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className={`border-0 shadow-sm ${isSubscribed ? 'bg-emerald-50' : 'bg-blue-50'}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isSubscribed ? 'bg-emerald-100' : 'bg-blue-100'}`}>
              <Bell className={`h-6 w-6 ${isSubscribed ? 'text-emerald-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Push-notifikationer
                {isSubscribed && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aktiverad
                  </Badge>
                )}
              </CardTitle>
              <p className={`text-sm mt-1 ${isSubscribed ? 'text-emerald-700' : 'text-blue-700'}`}>
                {isSubscribed 
                  ? 'Du får notifikationer även när appen är stängd'
                  : 'Aktivera för att få notifikationer direkt till din enhet'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
            <Smartphone className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              {isSubscribed 
                ? 'Prenumeration aktiv - Du kommer att få push-notifikationer på din enhet'
                : 'Aktivera för att få omedelbar notification när något viktigt händer'}
            </div>
          </div>

          <div className="flex gap-3">
            {!isSubscribed ? (
              <Button
                onClick={handleSubscribe}
                disabled={isLoading || !vapidPublicKey}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
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
                    Aktivera push-notifikationer
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleUnsubscribe}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Inaktiverar...
                  </>
                ) : (
                  'Inaktivera'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Helper function to convert VAPID key
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