import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function OnboardingProgressView({ employee }) {
  const { data: templates = [] } = useQuery({
    queryKey: ['onboarding-templates-all'],
    queryFn: () => base44.entities.OnboardingTemplate.list(),
  });

  const primaryTemplate = templates.find(t => t.id === employee.assigned_onboarding_template_id);
  
  if (!primaryTemplate) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Ingen onboarding-mall tilldelad</p>
        </CardContent>
      </Card>
    );
  }

  const completedTasks = (employee.onboarding_completed_tasks || []).length;
  const totalTasks = primaryTemplate.tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const statusConfig = {
    not_started: { label: 'Ej startad', color: 'bg-slate-100 text-slate-700', icon: Circle },
    in_progress: { label: 'Pågår', color: 'bg-blue-100 text-blue-700', icon: Circle },
    completed: { label: 'Slutförd', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  };

  const status = employee.onboarding_status || 'not_started';
  const cfg = statusConfig[status] || statusConfig.not_started;

  return (
    <div className="space-y-4">
      {/* Mall Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Tilldelad onboarding-mall</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-slate-900">{primaryTemplate.name}</p>
            {primaryTemplate.description && (
              <p className="text-sm text-slate-600 mt-1">{primaryTemplate.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Badge className={cfg.color}>{cfg.label}</Badge>
              {employee.onboarding_start_date && (
                <span className="text-xs text-slate-500">
                  Startad {format(new Date(employee.onboarding_start_date), 'd MMM yyyy', { locale: sv })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {totalTasks > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Framsteg</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  {completedTasks} av {totalTasks} uppgifter slutförda
                </span>
                <span className="text-sm font-semibold text-slate-900">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uppgifter */}
      {primaryTemplate.tasks && primaryTemplate.tasks.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Uppgifter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {primaryTemplate.tasks.map((task, idx) => {
                const done = (employee.onboarding_completed_tasks || []).includes(task.title);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {task.title}
                      </p>
                      {task.description && !done && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}
                    </div>
                    {task.is_critical && (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}