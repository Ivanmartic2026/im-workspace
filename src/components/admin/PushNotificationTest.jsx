import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function PushNotificationTest() {
  const [title, setTitle] = useState('Test-meddelande');
  const [message, setMessage] = useState('Detta är ett testmeddelande för push-notifikationer.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [notificationsSupported, setNotificationsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    setNotificationsSupported('Notification' in window);
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Din webbläsare stöder inte push-notifikationer');
      return;
    }

    if (Notification.permission === 'granted') {
      alert('Du har redan godkänt notifikationer');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Test notification
      new Notification('Notifikationer aktiverade!', {
        icon: '/logo.png',
        body: 'Du kommer nu att motta push-notifikationer'
      });
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Fyll i rubrik och meddelande');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('sendPushNotification', {
        title: title.trim(),
        message: message.trim()
      });

      setResult({
        success: true,
        data: response.data
      });

      // Also show a local test notification
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/logo.png'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    }

    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Push-notifikationer</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {notificationsSupported 
                  ? `Status: ${Notification.permission === 'granted' ? '✓ Aktiverad' : '○ Behöver godkännas'}`
                  : 'Din webbläsare stöder inte notifikationer'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {notificationsSupported && Notification.permission !== 'granted' && (
        <Card className="border-0 shadow-sm bg-amber-50 border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-amber-900 mb-3">
              Du behöver godkänna notifikationer för att testa funktionen.
            </p>
            <Button 
              onClick={handleRequestPermission}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Aktivera notifikationer
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-2 block">Rubrik</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="T.ex. Nytt tidrapport klart"
                disabled={sending}
                className="h-11"
              />
            </div>

            <div>
              <Label className="font-semibold mb-2 block">Meddelande</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Skriv testmeddelandet här..."
                disabled={sending}
                className="min-h-24 resize-none"
              />
            </div>

            <Button
              onClick={handleSendNotification}
              disabled={sending || !notificationsSupported}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Skicka testnotifiering
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`border-0 shadow-sm ${result.success ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-semibold ${result.success ? 'text-emerald-900' : 'text-red-900'}`}>
                    {result.success ? 'Notifiering skickad!' : 'Fel vid skickning'}
                  </p>
                  <p className={`text-sm mt-1 ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.success 
                      ? result.data.message 
                      : result.error}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card className="border-0 shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base">Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>• Notifikationer skickas till alla användare i systemet</p>
          <p>• En test-notifiering visas även lokalt på din enhet</p>
          <p>• Notifikationer sparas i systemet för senare läsning</p>
          <p>• Användare kan aktivera/inaktivera notifikationer i sina inställningar</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}