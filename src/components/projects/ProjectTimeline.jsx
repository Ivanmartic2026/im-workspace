import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import { sv } from "date-fns/locale";

export default function ProjectTimeline({ project, tasks }) {
  const sortedTasks = [...tasks]
    .filter(t => t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const projectDuration = project.start_date && project.end_date
    ? differenceInDays(new Date(project.end_date), new Date(project.start_date))
    : null;

  const daysRemaining = project.end_date
    ? differenceInDays(new Date(project.end_date), new Date())
    : null;

  return (
    <div className="space-y-4">
      {/* Project Timeline Card */}
      {project.start_date && project.end_date && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Projekttidslinje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Startdatum</p>
                <p className="font-medium text-slate-900">
                  {format(new Date(project.start_date), 'd MMM yyyy', { locale: sv })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Varaktighet</p>
                <p className="font-medium text-slate-900">{projectDuration} dagar</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Slutdatum</p>
                <p className="font-medium text-slate-900">
                  {format(new Date(project.end_date), 'd MMM yyyy', { locale: sv })}
                </p>
              </div>
            </div>

            {daysRemaining !== null && (
              <div className="pt-3 border-t text-center">
                <p className={`text-sm font-medium ${
                  daysRemaining < 0 ? 'text-rose-600' :
                  daysRemaining < 7 ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {daysRemaining < 0 
                    ? `${Math.abs(daysRemaining)} dagar försenat`
                    : daysRemaining === 0
                    ? 'Slutar idag'
                    : `${daysRemaining} dagar kvar`
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tasks Timeline */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Uppgifter tidslinje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Inga uppgifter med deadlines än
            </p>
          ) : (
            <div className="space-y-3">
              {sortedTasks.map(task => {
                const isOverdue = isPast(new Date(task.due_date)) && task.status !== 'completed';
                const isUpcoming = isFuture(new Date(task.due_date));
                
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      task.status === 'completed' ? 'border-emerald-500 bg-emerald-50' :
                      isOverdue ? 'border-rose-500 bg-rose-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {task.status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                          <h4 className={`font-medium text-sm ${
                            task.status === 'completed' ? 'text-emerald-900 line-through' : 'text-slate-900'
                          }`}>
                            {task.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600">
                          {format(new Date(task.due_date), 'd MMMM yyyy', { locale: sv })}
                        </p>
                      </div>
                      <Badge className={
                        task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        isOverdue ? 'bg-rose-100 text-rose-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {task.status === 'completed' ? 'Klar' :
                         isOverdue ? 'Försenad' :
                         'Kommande'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}