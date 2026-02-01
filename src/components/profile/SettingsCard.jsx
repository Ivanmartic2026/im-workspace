import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Bell, BellOff, Sun, Moon, MonitorSmartphone, FolderKanban, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

export default function SettingsCard({ user }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['myEmployee', user?.email],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ user_email: user?.email });
      return employees[0] || null;
    },
    enabled: !!user,
  });

  const { data: projects } = useQuery({
    queryKey: ['activeProjects'],
    queryFn: () => base44.entities.Project.filter({ status: 'pågående' }),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (employee) {
        return base44.entities.Employee.update(employee.id, data);
      } else {
        return base44.entities.Employee.create({ ...data, user_email: user.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEmployee'] });
      setIsSaving(false);
      toast.success('Inställningar sparade');
    },
  });

  const handleNotificationToggle = (key, value) => {
    const currentPrefs = employee?.notification_preferences || {};
    const updatedPrefs = { ...currentPrefs, [key]: value };
    setIsSaving(true);
    updateMutation.mutate({ notification_preferences: updatedPrefs });
  };

  const handleThemeChange = (theme) => {
    setIsSaving(true);
    updateMutation.mutate({ theme_preference: theme });
    
    // Apply theme immediately
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto mode
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleDefaultProjectChange = (projectId) => {
    setIsSaving(true);
    updateMutation.mutate({ default_project_id: projectId });
  };

  const notificationPrefs = employee?.notification_preferences || {};
  const theme = employee?.theme_preference || 'light';
  const defaultProjectId = employee?.default_project_id;

  const notificationOptions = [
    { key: 'time_report_approved', label: 'Godkända tidrapporter', icon: Check },
    { key: 'time_report_rejected', label: 'Avvisade tidrapporter', icon: BellOff },
    { key: 'leave_request_approved', label: 'Godkända ledighetsansökningar', icon: Check },
    { key: 'leave_request_rejected', label: 'Avvisade ledighetsansökningar', icon: BellOff },
    { key: 'new_project_task', label: 'Nya projektuppgifter', icon: FolderKanban },
    { key: 'time_anomaly_detected', label: 'Avvikelser i tidrapportering', icon: Bell },
    { key: 'forgot_clock_out', label: 'Glömt stämpla ut', icon: Bell },
    { key: 'overtime_warning', label: 'Övertidsvarningar', icon: Bell },
    { key: 'vehicle_maintenance', label: 'Fordonsunderhåll', icon: Bell },
    { key: 'driving_journal_needs_review', label: 'Körjournal behöver granskas', icon: Bell },
    { key: 'news_and_announcements', label: 'Nyheter och meddelanden', icon: Bell },
  ];

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Theme Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Tema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Ljust
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Mörkt
                  </div>
                </SelectItem>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone className="h-4 w-4" />
                    Automatisk
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {isSaving && updateMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
          <p className="text-xs text-slate-500">
            {theme === 'auto' 
              ? 'Följer enhetens systeminställningar' 
              : `${theme === 'light' ? 'Ljust' : 'Mörkt'} tema aktiverat`}
          </p>
        </CardContent>
      </Card>

      {/* Default Project */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Standardprojekt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select 
            value={defaultProjectId || 'none'} 
            onValueChange={(val) => handleDefaultProjectChange(val === 'none' ? null : val)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Inget standardprojekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Inget standardprojekt</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Projektet som väljs automatiskt vid instämpling
          </p>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifikationer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationOptions.map(({ key, label, icon: Icon }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div className="flex items-center gap-3 flex-1">
                <Icon className="h-4 w-4 text-slate-400" />
                <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                  {label}
                </Label>
              </div>
              <Switch
                id={key}
                checked={notificationPrefs[key] !== false}
                onCheckedChange={(checked) => handleNotificationToggle(key, checked)}
              />
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}