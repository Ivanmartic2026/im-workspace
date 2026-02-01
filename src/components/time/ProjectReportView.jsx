import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Clock, TrendingUp, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { sv } from "date-fns/locale";

export default function ProjectReportView({ timeEntries, userEmail }) {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const all = await base44.entities.Project.list('-updated_date');
      return all.filter(p => p.status === 'pågående');
    },
    initialData: []
  });

  const projectStats = useMemo(() => {
    const stats = {};
    
    timeEntries.forEach(entry => {
      if (entry.project_allocations && entry.status === 'completed') {
        entry.project_allocations.forEach(allocation => {
          if (!stats[allocation.project_id]) {
            stats[allocation.project_id] = {
              totalHours: 0,
              weekHours: 0,
              monthHours: 0,
              entries: 0
            };
          }
          stats[allocation.project_id].totalHours += allocation.hours || 0;
          stats[allocation.project_id].entries += 1;

          // Weekly hours
          const entryDate = new Date(entry.date);
          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
          if (isWithinInterval(entryDate, { start: weekStart, end: weekEnd })) {
            stats[allocation.project_id].weekHours += allocation.hours || 0;
          }

          // Monthly hours
          const monthStart = startOfMonth(new Date());
          const monthEnd = endOfMonth(new Date());
          if (isWithinInterval(entryDate, { start: monthStart, end: monthEnd })) {
            stats[allocation.project_id].monthHours += allocation.hours || 0;
          }
        });
      }
    });

    return Object.entries(stats).map(([projectId, data]) => {
      const project = projects.find(p => p.id === projectId);
      return {
        projectId,
        projectName: project?.name || 'Okänt projekt',
        projectCode: project?.project_code || '',
        ...data
      };
    }).sort((a, b) => b.monthHours - a.monthHours);
  }, [timeEntries, projects]);

  const totalHours = projectStats.reduce((sum, stat) => sum + stat.totalHours, 0);
  const totalWeekHours = projectStats.reduce((sum, stat) => sum + stat.weekHours, 0);
  const totalMonthHours = projectStats.reduce((sum, stat) => sum + stat.monthHours, 0);

  if (projectStats.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Inga projekt registrerade än</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 bg-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-indigo-600" />
              <p className="text-xs font-medium text-indigo-900">Denna vecka</p>
            </div>
            <p className="text-2xl font-bold text-indigo-900">{totalWeekHours.toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-medium text-blue-900">Denna månad</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">{totalMonthHours.toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-medium text-emerald-900">Totalt</p>
            </div>
            <p className="text-2xl font-bold text-emerald-900">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
      </div>

      {/* Project List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Timmar per projekt
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {projectStats.map((stat) => (
              <div key={stat.projectId} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{stat.projectName}</h3>
                    {stat.projectCode && (
                      <p className="text-xs text-slate-500 mt-0.5">{stat.projectCode}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{stat.totalHours.toFixed(1)}h</p>
                    <p className="text-xs text-slate-500">{stat.entries} registreringar</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Denna vecka</p>
                    <p className="font-semibold text-slate-900">{stat.weekHours.toFixed(1)}h</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Denna månad</p>
                    <p className="font-semibold text-slate-900">{stat.monthHours.toFixed(1)}h</p>
                  </div>
                </div>

                {/* Progress bar for month */}
                {stat.monthHours > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Andel av månadens arbete</span>
                      <span>{Math.round((stat.monthHours / totalMonthHours) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${(stat.monthHours / totalMonthHours) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}