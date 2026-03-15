import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Clock } from "lucide-react";
import { format, startOfWeek, isSameWeek } from "date-fns";
import { sv } from "date-fns/locale";

function getWeekLabel(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const weekNum = Math.ceil(((start - new Date(start.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `Vecka ${weekNum} (${format(start, 'd MMM', { locale: sv })} – ${format(end, 'd MMM', { locale: sv })})`;
}

function getWeekKey(date) {
  const start = startOfWeek(new Date(date), { weekStartsOn: 1 });
  return format(start, 'yyyy-MM-dd');
}

export default function TimeAnomaliesReport() {
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Hämta tidjusteringsförfrågningar
  const { data: adjustments = [] } = useQuery({
    queryKey: ['approvalRequests-time'],
    queryFn: () => base44.entities.ApprovalRequest.filter({ status: 'pending' }, '-created_date', 200),
  });

  // Hämta flaggade avvikelser
  const { data: anomalyEntries = [] } = useQuery({
    queryKey: ['timeEntries-anomalies'],
    queryFn: () => base44.entities.TimeEntry.filter({ anomaly_flag: true }, '-date', 200),
  });

  // Hämta needs_correction
  const { data: correctionEntries = [] } = useQuery({
    queryKey: ['timeEntries-correction'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'needs_correction' }, '-date', 200),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, kind }) => {
      if (kind === 'approval') {
        return base44.entities.ApprovalRequest.update(id, { status: 'approved', reviewed_by: user?.email, reviewed_at: new Date().toISOString() });
      }
      return base44.entities.TimeEntry.update(id, { anomaly_flag: false, status: 'completed', approved_by: user?.email, approved_at: new Date().toISOString() });
    },
    onSuccess: (_, vars) => {
      if (vars.kind === 'approval') queryClient.invalidateQueries({ queryKey: ['approvalRequests-time'] });
      else {
        queryClient.invalidateQueries({ queryKey: ['timeEntries-anomalies'] });
        queryClient.invalidateQueries({ queryKey: ['timeEntries-correction'] });
      }
    },
  });

  const timeAdjustments = adjustments.filter(a => a.type === 'time_adjustment');

  const allItems = [
    ...timeAdjustments.map(r => ({ ...r, _kind: 'adjustment', _date: r.created_date })),
    ...anomalyEntries.map(r => ({ ...r, _kind: 'anomaly', _date: r.date })),
    ...correctionEntries.map(r => ({ ...r, _kind: 'correction', _date: r.date })),
  ];

  // Deduplicate by id
  const seen = new Set();
  const uniqueItems = allItems.filter(item => {
    const key = `${item._kind}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Gruppera per vecka
  const byWeek = {};
  uniqueItems.forEach(item => {
    const key = getWeekKey(item._date);
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(item);
  });

  const sortedWeeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a));
  const toggleWeek = (key) => setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));

  if (uniqueItems.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Inga tidjusteringar eller avvikelser</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-rose-500" />
        <span className="text-sm text-slate-600 font-medium">{uniqueItems.length} ärenden att hantera</span>
      </div>

      {sortedWeeks.map(weekKey => {
        const items = byWeek[weekKey];
        const weekDate = new Date(weekKey);
        const isExpanded = expandedWeeks[weekKey] !== false;
        const isCurrentWeek = isSameWeek(weekDate, new Date(), { weekStartsOn: 1 });

        return (
          <Card key={weekKey} className={`border-0 shadow-sm overflow-hidden ${isCurrentWeek ? 'ring-2 ring-rose-300' : ''}`}>
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              onClick={() => toggleWeek(weekKey)}
            >
              <div className="flex items-center gap-3">
                {isCurrentWeek && <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />}
                <span className="font-semibold text-slate-900 text-sm">{getWeekLabel(weekDate)}</span>
                <Badge className="bg-rose-100 text-rose-700 text-xs">{items.length} st</Badge>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {items.map(item => (
                  <div key={`${item._kind}-${item.id}`} className="p-4">
                    {item._kind === 'adjustment' && (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className="bg-purple-100 text-purple-700 text-xs">Tidjustering</Badge>
                            <span className="text-xs text-slate-500">{format(new Date(item._date), 'd MMM HH:mm', { locale: sv })}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900">{item.requester_name || item.requester_email}</p>
                          <p className="text-xs text-slate-500 truncate">{item.description}</p>
                          {item.reason && <p className="text-xs text-slate-400 mt-1 italic">"{item.reason}"</p>}
                          {item.requested_data && (
                            <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600">
                              <span className="font-medium">Begärd ändring: </span>
                              {item.requested_data.clock_in_time && `In: ${format(new Date(item.requested_data.clock_in_time), 'HH:mm')}`}
                              {item.requested_data.clock_out_time && ` Ut: ${format(new Date(item.requested_data.clock_out_time), 'HH:mm')}`}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 flex-shrink-0"
                          onClick={() => resolveMutation.mutate({ id: item.id, kind: 'approval' })}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Stäng
                        </Button>
                      </div>
                    )}

                    {(item._kind === 'anomaly' || item._kind === 'correction') && (
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={item._kind === 'anomaly' ? "bg-rose-100 text-rose-700 text-xs" : "bg-amber-100 text-amber-700 text-xs"}>
                              {item._kind === 'anomaly' ? 'Avvikelse' : 'Behöver korrigering'}
                            </Badge>
                            <span className="text-xs text-slate-500">{format(new Date(item._date), 'd MMM', { locale: sv })}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900">{item.employee_email}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>
                              {item.clock_in_time ? format(new Date(item.clock_in_time), 'HH:mm') : '--'} – {item.clock_out_time ? format(new Date(item.clock_out_time), 'HH:mm') : '--'} · {(item.total_hours || 0).toFixed(1)}h
                            </span>
                          </div>
                          {item.anomaly_reason && <p className="text-xs text-rose-500 mt-1">⚠ {item.anomaly_reason}</p>}
                          {item.edit_reason && <p className="text-xs text-slate-400 mt-1 italic">"{item.edit_reason}"</p>}
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 flex-shrink-0"
                          onClick={() => resolveMutation.mutate({ id: item.id, kind: 'time' })}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Stäng
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}