import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Smartphone, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const notificationTypes = [
  { key: 'onboarding_tasks', label: 'Onboarding-uppgifter', description: 'Få notiser om nya uppgifter' },
  { key: 'time_entries', label: 'Tidrapportering', description: 'Påminnelser om utst'
    + 'ämpling och tidrapporter' },
  { key: 'leave_requests', label: 'Semesteransökningar', description: 'Status för dina ansökningar' },
  { key: 'vehicle_maintenance', label: 'Fordonsunderhåll', description: 'Service och underhållspåminnelser' },
  { key: 'chat_messages', label: 'Chattmeddelanden', description: 'Nya meddelanden från kollegor' },
  { key: 'project_updates', label: 'Projektuppdateringar', description: 'Uppdateringar om dina projekt' },
  { key: 'news_posts', label: 'Nyheter', description: 'Företagsnyheter och meddelanden' },
  { key: 'system_alerts', label: 'Systemaviseringar', description: 'Viktiga systemmeddelanden' },
];

export default function NotificationSettings() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notificationSettings', user?.email],
    queryFn: async () => {
      const results = await base44.entities.NotificationSettings.filter({ user_email: user.email });
      if (results.length > 0) return results[0];
      
      // Create default settings
      return base44.entities.NotificationSettings.create({
        user_email: user.email,
        onboarding_tasks: true,
        time_entries: true,
        leave_requests: true,
        vehicle_maintenance: true,
        chat_messages: true,
        project_updates: true,
        news_posts: true,
        system_alerts: true,
        push_enabled: false,
        email_enabled: true
      });
    },
    enabled: !!user?.email,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.NotificationSettings.update(settings.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    },
  });

  const handleToggle = (key, value) => {
    updateMutation.mutate({ [key]: value });
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Notisinställningar</h1>

          {/* Delivery Methods */}
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Leveransmetoder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-slate-500" />
                  <div>
                    <Label className="text-base">Push-notiser</Label>
                    <p className="text-sm text-slate-500">Få notiser på din enhet</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.push_enabled}
                  onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-500" />
                  <div>
                    <Label className="text-base">Email-notiser</Label>
                    <p className="text-sm text-slate-500">Få notiser via email</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.email_enabled}
                  onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Notistyper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <Label className="text-base">{type.label}</Label>
                    <p className="text-sm text-slate-500">{type.description}</p>
                  </div>
                  <Switch
                    checked={settings?.[type.key]}
                    onCheckedChange={(checked) => handleToggle(type.key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}