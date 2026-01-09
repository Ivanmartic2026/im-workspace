import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, FileText, Archive, Clock, Calendar, CheckCircle2, Loader2, Play, Pause } from "lucide-react";
import { toast } from "sonner";

export default function AutomationSettings() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['scheduled-tasks'],
    queryFn: async () => {
      const response = await fetch('/.base44/api/scheduled-tasks', {
        headers: {
          'Authorization': `Bearer ${await base44.auth.getToken()}`
        }
      });
      return response.json();
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      const response = await fetch(`/.base44/api/scheduled-tasks/${taskId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await base44.auth.getToken()}`
        }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      toast.success('Automation uppdaterad');
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async (functionName) => {
      const response = await base44.functions.invoke(functionName);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Automation körd');
    },
    onError: (error) => {
      toast.error(`Fel: ${error.message}`);
    }
  });

  const reminderTask = tasks.find(t => t.function_name === 'sendTimeReportReminders');
  const summaryTask = tasks.find(t => t.function_name === 'generateMonthlySummaries');
  const archiveTask = tasks.find(t => t.function_name === 'archiveOldData');

  const createTaskMutation = useMutation({
    mutationFn: async ({ name, functionName, schedule }) => {
      const response = await fetch('/.base44/api/scheduled-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await base44.auth.getToken()}`
        },
        body: JSON.stringify({
          name,
          function_name: functionName,
          schedule_type: schedule.type,
          repeat_interval: schedule.interval,
          repeat_unit: schedule.unit,
          start_time: schedule.time,
          is_active: true
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      toast.success('Automation skapad');
    },
  });

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Automatisering</h2>
        <p className="text-sm text-slate-500">Automatisera repetitiva uppgifter och schemalägg processer</p>
      </div>

      <Tabs defaultValue="reminders">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="reminders">
            <Bell className="h-4 w-4 mr-2" />
            Påminnelser
          </TabsTrigger>
          <TabsTrigger value="summaries">
            <FileText className="h-4 w-4 mr-2" />
            Sammanställningar
          </TabsTrigger>
          <TabsTrigger value="archive">
            <Archive className="h-4 w-4 mr-2" />
            Arkivering
          </TabsTrigger>
        </TabsList>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  Automatiska påminnelser
                </span>
                {reminderTask && (
                  <Badge variant={reminderTask.is_active ? "default" : "outline"}>
                    {reminderTask.is_active ? 'Aktiv' : 'Pausad'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Skicka automatiska påminnelser till anställda som inte har lämnat in tidrapporter eller körtjournaler.
              </p>

              {reminderTask ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Schema</p>
                        <p className="text-xs text-slate-500">
                          Varje {reminderTask.repeat_unit === 'days' ? 'dag' : reminderTask.repeat_unit} kl {reminderTask.start_time || '09:00'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runNowMutation.mutate('sendTimeReportReminders')}
                        disabled={runNowMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Kör nu
                      </Button>
                      <Button
                        size="sm"
                        variant={reminderTask.is_active ? "outline" : "default"}
                        onClick={() => toggleTaskMutation.mutate(reminderTask.id)}
                        disabled={toggleTaskMutation.isPending}
                      >
                        {reminderTask.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pausa
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Aktivera
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Tidrapporter</p>
                      <p className="text-sm font-medium text-slate-900">Påminner om ofullständiga veckorapporter</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Körjournal</p>
                      <p className="text-sm font-medium text-slate-900">Påminner om ej kategoriserade resor</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => createTaskMutation.mutate({
                    name: 'Dagliga påminnelser',
                    functionName: 'sendTimeReportReminders',
                    schedule: { type: 'simple', interval: 1, unit: 'days', time: '09:00' }
                  })}
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                  Aktivera automatiska påminnelser
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summaries Tab */}
        <TabsContent value="summaries" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Månatliga sammanställningar
                </span>
                {summaryTask && (
                  <Badge variant={summaryTask.is_active ? "default" : "outline"}>
                    {summaryTask.is_active ? 'Aktiv' : 'Pausad'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Generera automatiska månatliga sammanställningar av körtider och körsträckor per anställd.
              </p>

              {summaryTask ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Schema</p>
                        <p className="text-xs text-slate-500">
                          Första dagen varje månad
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runNowMutation.mutate('generateMonthlySummaries')}
                        disabled={runNowMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Kör nu
                      </Button>
                      <Button
                        size="sm"
                        variant={summaryTask.is_active ? "outline" : "default"}
                        onClick={() => toggleTaskMutation.mutate(summaryTask.id)}
                        disabled={toggleTaskMutation.isPending}
                      >
                        {summaryTask.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pausa
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Aktivera
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">Vad inkluderas:</h4>
                    <ul className="space-y-1 text-sm text-slate-600">
                      <li>• Totala arbetstimmar per anställd</li>
                      <li>• Körsträckor och kostnader</li>
                      <li>• Tjänst- vs privatresor</li>
                      <li>• Övertid och semester</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => createTaskMutation.mutate({
                    name: 'Månatlig sammanställning',
                    functionName: 'generateMonthlySummaries',
                    schedule: { type: 'simple', interval: 1, unit: 'months', time: '08:00' }
                  })}
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Aktivera månatliga sammanställningar
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-purple-600" />
                  Automatisk arkivering
                </span>
                {archiveTask && (
                  <Badge variant={archiveTask.is_active ? "default" : "outline"}>
                    {archiveTask.is_active ? 'Aktiv' : 'Pausad'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Arkivera automatiskt gamla data och rapporter efter en viss tid för att hålla systemet rent.
              </p>

              {archiveTask ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Archive className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Schema</p>
                        <p className="text-xs text-slate-500">
                          Varje månad
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runNowMutation.mutate('archiveOldData')}
                        disabled={runNowMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Kör nu
                      </Button>
                      <Button
                        size="sm"
                        variant={archiveTask.is_active ? "outline" : "default"}
                        onClick={() => toggleTaskMutation.mutate(archiveTask.id)}
                        disabled={toggleTaskMutation.isPending}
                      >
                        {archiveTask.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pausa
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Aktivera
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">Arkiveringsregler:</h4>
                    <ul className="space-y-1 text-sm text-slate-600">
                      <li>• Tidrapporter äldre än 12 månader</li>
                      <li>• Körjournaler äldre än 24 månader</li>
                      <li>• Notifikationer äldre än 3 månader</li>
                      <li>• Chattmeddelanden äldre än 6 månader</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => createTaskMutation.mutate({
                    name: 'Automatisk arkivering',
                    functionName: 'archiveOldData',
                    schedule: { type: 'simple', interval: 1, unit: 'months', time: '02:00' }
                  })}
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
                  Aktivera automatisk arkivering
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}