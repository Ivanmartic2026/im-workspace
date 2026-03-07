import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Briefcase, Users, Play, Save, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const SETTING_KEY = 'smart_alerts_config';

export default function SmartAlertsConfig() {
  const queryClient = useQueryClient();

  const [config, setConfig] = useState({
    clock_out_hours: 10,
    budget_warning_pct: 80,
    budget_critical_pct: 100,
    min_daily_hours: 4,
    check_clock_out: true,
    check_budget: true,
    check_missing_hours: true,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => base44.entities.NotificationSettings.list(),
  });

  useEffect(() => {
    const record = settings.find(s => s.setting_key === SETTING_KEY);
    if (record?.setting_value) {
      setConfig(prev => ({ ...prev, ...record.setting_value }));
    }
  }, [settings]);

  const existingRecord = settings.find(s => s.setting_key === SETTING_KEY);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (existingRecord) {
        return base44.entities.NotificationSettings.update(existingRecord.id, { setting_value: config });
      } else {
        return base44.entities.NotificationSettings.create({
          setting_key: SETTING_KEY,
          setting_value: config,
          description: 'Smart alerts configuration'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Inställningar sparade!');
    },
    onError: () => toast.error('Kunde inte spara inställningar'),
  });

  const runNowMutation = useMutation({
    mutationFn: () => base44.functions.invoke('smartAlerts'),
    onSuccess: (res) => {
      const d = res.data;
      toast.success(`Kontroll klar! ${d.sent} notiser skickade.`);
    },
    onError: () => toast.error('Kunde inte köra kontrollen'),
  });

  const set = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4">
      {/* Clock Out Reminder */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Påminnelse om utstämpling
            </span>
            <Switch
              checked={config.check_clock_out}
              onCheckedChange={v => set('check_clock_out', v)}
            />
          </CardTitle>
        </CardHeader>
        {config.check_clock_out && (
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">
              Skicka en notis till anställda som har varit instämplade längre än X timmar.
            </p>
            <div className="flex items-center gap-3">
              <Label className="w-48 text-sm">Skicka notis efter</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={config.clock_out_hours}
                  onChange={e => set('clock_out_hours', Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-slate-600">timmar</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Anställda får en push-notis i appen när de uppnår gränsen.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Budget Alerts */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              Projektbudget-varningar
            </span>
            <Switch
              checked={config.check_budget}
              onCheckedChange={v => set('check_budget', v)}
            />
          </CardTitle>
        </CardHeader>
        {config.check_budget && (
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">
              Skicka en notis till administratörer när ett projekt når en viss procent av sin timbudget.
            </p>
            <div className="flex items-center gap-3">
              <Label className="w-48 text-sm">Varning vid</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={config.budget_warning_pct}
                  onChange={e => set('budget_warning_pct', Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-slate-600">% av budget</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-48 text-sm">Kritisk varning vid</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={config.budget_critical_pct}
                  onChange={e => set('budget_critical_pct', Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-slate-600">% av budget</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-amber-50 rounded-lg text-xs text-amber-800 text-center">
                ⚠️ Varning vid {config.budget_warning_pct}%
              </div>
              <div className="p-2 bg-red-50 rounded-lg text-xs text-red-800 text-center">
                🚨 Kritisk vid {config.budget_critical_pct}%
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Missing Hours */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Saknade timmar
            </span>
            <Switch
              checked={config.check_missing_hours}
              onCheckedChange={v => set('check_missing_hours', v)}
            />
          </CardTitle>
        </CardHeader>
        {config.check_missing_hours && (
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">
              Skicka en daglig notis till administratörer om anställda som inte rapporterat några timmar föregående arbetsdag (mån–fre).
            </p>
            <div className="flex items-center gap-3">
              <Label className="w-48 text-sm">Miniminivå timmar/dag</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={12}
                  step={0.5}
                  value={config.min_daily_hours}
                  onChange={e => set('min_daily_hours', Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-slate-600">timmar</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 flex items-start gap-2">
              <Bell className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Administratörer får en notis varje morgon om anställda med 0 rapporterade timmar föregående dag.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex-1"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Spara inställningar
        </Button>
        <Button
          variant="outline"
          onClick={() => runNowMutation.mutate()}
          disabled={runNowMutation.isPending}
        >
          {runNowMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Kör kontroll nu
        </Button>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Kontrollen körs automatiskt via schemaläggning. Aktivera automationen under fliken "Påminnelser".
      </p>
    </div>
  );
}