import React, { useState, useEffect } from 'react';
import { Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PushNotificationTest() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('Test-notifikation från IM Workspace');
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const handleSendTestPush = async () => {
    if (!user) {
      toast.error('Användare inte inloggad');
      return;
    }

    setLoading(true);
    try {
      const result = await base44.functions.invoke('sendPushNotification', {
        recipient_email: user.email,
        title: '🧪 Test-notifikation',
        message: testMessage,
        type: 'system',
        priority: 'normal',
        action_url: '/'
      });

      if (result.data.success) {
        setLastResult({
          success: true,
          sent: result.data.sent,
          failed: result.data.failed,
          message: result.data.message
        });
        toast.success(`Test-push skickad till ${result.data.sent} enhet(er)`);
      } else {
        setLastResult({
          success: false,
          message: result.data.error || 'Kunde inte skicka test-push'
        });
        toast.error('Fel vid test-push');
      }
    } catch (error) {
      console.error('Error sending test push:', error);
      setLastResult({
        success: false,
        message: error.message || 'Okänt fel vid test-push'
      });
      toast.error('Fel: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          Test av Push-notifikationer
        </CardTitle>
        <CardDescription>
          Skicka en test-push till din enhet för att verifiera att systemet fungerar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current User */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-1 block">
            Skicka test-push till
          </Label>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-medium text-slate-900">{user?.full_name || 'Okänd'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        {/* Test Message */}
        <div>
          <Label htmlFor="test-message" className="text-sm font-medium text-slate-700 mb-2 block">
            Meddelande
          </Label>
          <Input
            id="test-message"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Skriv test-meddelandet här..."
            className="h-10"
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendTestPush}
          disabled={loading || !user}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Skickar...
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Skicka test-push
            </>
          )}
        </Button>

        {/* Result */}
        {lastResult && (
          <div
            className={`p-4 rounded-lg border flex gap-3 ${
              lastResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            {lastResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${
                  lastResult.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {lastResult.success ? 'Test-push skickad' : 'Fel vid test-push'}
              </p>
              <p
                className={`text-xs mt-1 ${
                  lastResult.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {lastResult.message}
              </p>
              {lastResult.success && lastResult.sent > 0 && (
                <p className="text-xs text-green-700 mt-1">
                  Skickat till {lastResult.sent} enhet(er)
                  {lastResult.failed > 0 && ` (${lastResult.failed} misslyckades)`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-2">💡 Instruktioner:</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc pl-5">
            <li>Gå först till din profil och aktivera push-notiser</li>
            <li>Skriv ett test-meddelande (eller använd standardtexten)</li>
            <li>Klicka på "Skicka test-push"</li>
            <li>Du bör få en notifikation på din enhet inom några sekunder</li>
            <li>Om du inte får något, kontrollera att notiser är aktiverade i webbläsarens inställningar</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}