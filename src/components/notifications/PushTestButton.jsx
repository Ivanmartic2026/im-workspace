import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PushTestButton({ user }) {
  const [loading, setLoading] = useState(false);

  const handleSendTestPush = async () => {
    if (user?.role !== 'admin') {
      toast.error('Endast admins kan skicka test-push');
      return;
    }

    setLoading(true);
    try {
      const result = await base44.functions.invoke('sendPushNotification', {
        recipient_email: user.email,
        title: '🧪 Test-notifikation',
        message: 'Detta är en test-push från IM Workspace. Om du ser detta fungerar push-notiseringarna!',
        type: 'system',
        priority: 'normal',
        action_url: '/'
      });

      if (result.data.success) {
        toast.success(`Test-push skickad till ${result.data.sent} enhet(er)`);
      } else {
        toast.error('Kunde inte skicka test-push');
      }
    } catch (error) {
      console.error('Error sending test push:', error);
      toast.error('Fel vid test-push: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <Button
      onClick={handleSendTestPush}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Skickar...
        </>
      ) : (
        <>
          <Send className="h-4 w-4 mr-2" />
          Test-push
        </>
      )}
    </Button>
  );
}