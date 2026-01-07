import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Smartphone, Save } from "lucide-react";

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    forgotClockOut: {
      enabled: true,
      hours: 12,
      channels: ['app', 'email']
    },
    overtimeWarning: {
      enabled: true,
      threshold: 10,
      channels: ['app']
    },
    approvalNeeded: {
      enabled: true,
      channels: ['app', 'email']
    },
    weeklyReminder: {
      enabled: false,
      day: 'friday',
      time: '15:00',
      channels: ['email']
    }
  });

  const handleSave = () => {
    // Save settings
    alert('Inställningar sparade!');
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Bell className="h-8 w-8" />
            <div>
              <h3 className="font-semibold mb-1">Påminnelser & Notiser</h3>
              <p className="text-sm text-white/70">
                Konfigurera automatiska påminnelser för anställda
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Clock Out */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Glömd utstämpling</CardTitle>
            <Switch
              checked={settings.forgotClockOut.enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  forgotClockOut: { ...prev.forgotClockOut, enabled: checked }
                }))
              }
            />
          </div>
        </CardHeader>
        {settings.forgotClockOut.enabled && (
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Påminn efter (timmar)</Label>
              <Input
                type="number"
                value={settings.forgotClockOut.hours}
                onChange={(e) => 
                  setSettings(prev => ({
                    ...prev,
                    forgotClockOut: { ...prev.forgotClockOut, hours: Number(e.target.value) }
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Kanaler</Label>
              <div className="flex gap-2">
                <Button
                  variant={settings.forgotClockOut.channels.includes('app') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const channels = settings.forgotClockOut.channels.includes('app')
                      ? settings.forgotClockOut.channels.filter(c => c !== 'app')
                      : [...settings.forgotClockOut.channels, 'app'];
                    setSettings(prev => ({
                      ...prev,
                      forgotClockOut: { ...prev.forgotClockOut, channels }
                    }));
                  }}
                >
                  <Bell className="h-3 w-3 mr-1" />
                  App
                </Button>
                <Button
                  variant={settings.forgotClockOut.channels.includes('email') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const channels = settings.forgotClockOut.channels.includes('email')
                      ? settings.forgotClockOut.channels.filter(c => c !== 'email')
                      : [...settings.forgotClockOut.channels, 'email'];
                    setSettings(prev => ({
                      ...prev,
                      forgotClockOut: { ...prev.forgotClockOut, channels }
                    }));
                  }}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Overtime Warning */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Övertidsvarning</CardTitle>
            <Switch
              checked={settings.overtimeWarning.enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  overtimeWarning: { ...prev.overtimeWarning, enabled: checked }
                }))
              }
            />
          </div>
        </CardHeader>
        {settings.overtimeWarning.enabled && (
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Varna efter (timmar per dag)</Label>
              <Input
                type="number"
                value={settings.overtimeWarning.threshold}
                onChange={(e) => 
                  setSettings(prev => ({
                    ...prev,
                    overtimeWarning: { ...prev.overtimeWarning, threshold: Number(e.target.value) }
                  }))
                }
              />
              <p className="text-xs text-slate-500">
                Anställd får påminnelse när de jobbar mer än detta antal timmar
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Approval Notifications */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Godkännandenotiser till chefer</CardTitle>
            <Switch
              checked={settings.approvalNeeded.enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  approvalNeeded: { ...prev.approvalNeeded, enabled: checked }
                }))
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Chefer får notiser när nya ansökningar behöver godkännas
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full h-12">
        <Save className="w-4 h-4 mr-2" />
        Spara inställningar
      </Button>

      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Kom ihåg:</strong> Påminnelser via SMS och push-notiser kräver ytterligare konfiguration.
            Kontakta support för att aktivera dessa funktioner.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}