import React, { useState, useEffect } from 'react';
import { Bell, BellOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PushNotificationSetup({ user }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalledPWA, setIsInstalledPWA] = useState(false);

  useEffect(() => {
    checkPushSupport();
    checkPWAInstallation();
    checkSubscriptionStatus();
  }, [user]);

  const checkPushSupport = async () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.MSStream;
    setIsIOS(isIOSDevice);
  };

  const checkPWAInstallation = () => {
    const isInstalled =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalledPWA(isInstalled);
  };

  const checkSubscriptionStatus = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check permission
      let permission = Notification.permission;

      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        setError('Push-notiser är inte tillåtna. Aktivera dem i webbläsarens inställningar.');
        setLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Get VAPID public key
      const { data: vapidData } = await base44.functions.invoke('getVapidPublicKey', {});
      if (!vapidData || !vapidData.vapidPublicKey) {
        throw new Error('Could not fetch VAPID public key');
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.vapidPublicKey)
      });

      // Extract keys
      const { endpoint, keys } = subscription.toJSON();

      // Determine device/browser info
      const userAgent = navigator.userAgent;
      let browser = 'Unknown';
      let device_name = 'Desktop';

      if (/Chrome/.test(userAgent)) browser = 'Chrome';
      else if (/Firefox/.test(userAgent)) browser = 'Firefox';
      else if (/Safari/.test(userAgent)) browser = 'Safari';
      else if (/Edge/.test(userAgent)) browser = 'Edge';

      if (/Mobile|Android|iPhone|iPad|iPod/.test(userAgent)) {
        device_name = 'Mobile';
      }

      // Save to database
      await base44.entities.PushSubscription.create({
        user_email: user.email,
        endpoint,
        auth_key: keys.auth,
        p256dh_key: keys.p256dh,
        browser,
        device_name,
        is_active: true
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError(err.message || 'Kunde inte aktivera push-notiser');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Mark as inactive in database
      const subs = await base44.entities.PushSubscription.filter({
        user_email: user.email,
        is_active: true
      });

      for (const sub of subs) {
        await base44.entities.PushSubscription.update(sub.id, {
          is_active: false
        });
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError(err.message || 'Kunde inte inaktivera push-notiser');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Push-notiser stöds inte i denna webbläsare
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Använd Chrome, Firefox, Edge eller Safari på iOS 16.4+
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isIOS && !isInstalledPWA) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Installera appen först
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Öppna denna sida i Safari, klicka på Dela → Lägg till på hemskärmen, sedan aktivera push-notiser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Push-notiser aktiverade
            </>
          ) : (
            <>
              <BellOff className="h-5 w-5 text-slate-400" />
              Push-notiser inaktiverade
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isSubscribed
            ? 'Du får push-notiser för viktiga händelser'
            : 'Aktivera push-notiser för direkta varningar'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {isSubscribed ? (
            <Button
              onClick={handleUnsubscribe}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Stänger av...
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Stäng av notiser
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aktiverar...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Aktivera notiser
                </>
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {isSubscribed
            ? 'Du kan stänga av notiserna när som helst.'
            : 'Vi skickar endast viktiga notiser baserat på dina inställningar.'}
        </p>
      </CardContent>
    </Card>
  );
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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