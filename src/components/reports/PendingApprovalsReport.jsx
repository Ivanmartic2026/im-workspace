import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns";
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

export default function PendingApprovalsReport() {
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const queryClient = useQueryClient();

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leaveRequests-all'],
    queryFn: () => base44.entities.LeaveRequest.filter({ status: 'pending' }, '-created_date', 200),
  });

  const { data: approvalRequests = [] } = useQuery({
    queryKey: ['approvalRequests-pending'],
    queryFn: () => base44.entities.ApprovalRequest.filter({ status: 'pending' }, '-created_date', 200),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries-review'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'pending_review' }, '-date', 200),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const leaveApproveMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LeaveRequest.update(id, { status, reviewed_by: user?.email, reviewed_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaveRequests-all'] }),
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ApprovalRequest.update(id, { status, reviewed_by: user?.email, reviewed_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvalRequests-pending'] }),
  });

  const timeEntryMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TimeEntry.update(id, { status, approved_by: user?.email, approved_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timeEntries-review'] }),
  });

  // Kombinera allt till en lista med veckogrupper
  const allItems = [
    ...leaveRequests.map(r => ({ ...r, _kind: 'leave', _date: r.created_date })),
    ...approvalRequests.map(r => ({ ...r, _kind: 'approval', _date: r.created_date })),
    ...timeEntries.map(r => ({ ...r, _kind: 'time', _date: r.date })),
  ];

  // Gruppera per vecka
  const byWeek = {};
  allItems.forEach(item => {
    const key = getWeekKey(item._date);
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(item);
  });

  const sortedWeeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a));

  const toggleWeek = (key) => setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));

  if (allItems.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Inga väntande godkännanden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <span className="text-sm text-slate-600 font-medium">{allItems.length} väntande godkännanden totalt</span>
      </div>

      {sortedWeeks.map(weekKey => {
        const items = byWeek[weekKey];
        const weekDate = new Date(weekKey);
        const isExpanded = expandedWeeks[weekKey] !== false; // default expanded
        const isCurrentWeek = isSameWeek(weekDate, new Date(), { weekStartsOn: 1 });

        return (
          <Card key={weekKey} className={`border-0 shadow-sm overflow-hidden ${isCurrentWeek ? 'ring-2 ring-amber-400' : ''}`}>
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              onClick={() => toggleWeek(weekKey)}
            >
              <div className="flex items-center gap-3">
                {isCurrentWeek && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
                <span className="font-semibold text-slate-900 text-sm">{getWeekLabel(weekDate)}</span>
                <Badge className="bg-rose-100 text-rose-700 text-xs">{items.length} st</Badge>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {items.map(item => (
                  <div key={item.id} className="p-4">
                    {item._kind === 'leave' && (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-100 text-blue-700 text-xs">Ledighet</Badge>
                            <span className="text-xs text-slate-500">{format(new Date(item._date), 'd MMM HH:mm', { locale: sv })}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900">{item.employee_email}</p>
                          <p className="text-xs text-slate-500">{item.type} · {item.start_date} – {item.end_date} · {item.days} dagar</p>
                          {item.reason && <p className="text-xs text-slate-400 mt-1 italic">"{item.reason}"</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => leaveApproveMutation.mutate({ id: item.id, status: 'approved' })}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> OK
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => leaveApproveMutation.mutate({ id: item.id, status: 'rejected' })}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Nej
                          </Button>
                        </div>
                      </div>
                    )}

                    {item._kind === 'approval' && (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-purple-100 text-purple-700 text-xs">Godkännande</Badge>
                            <span className="text-xs text-slate-500">{format(new Date(item._date), 'd MMM HH:mm', { locale: sv })}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900">{item.requester_name || item.requester_email}</p>
                          <p className="text-xs text-slate-500">{item.description}</p>
                          {item.reason && <p className="text-xs text-slate-400 mt-1 italic">"{item.reason}"</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => approvalMutation.mutate({ id: item.id, status: 'approved' })}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> OK
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => approvalMutation.mutate({ id: item.id, status: 'rejected' })}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Nej
                          </Button>
                        </div>
                      </div>
                    )}

                    {item._kind === 'time' && (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-amber-100 text-amber-700 text-xs">Tidrapport</Badge>
                            <span className="text-xs text-slate-500">{format(new Date(item._date), 'd MMM', { locale: sv })}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900">{item.employee_email}</p>
                          <p className="text-xs text-slate-500">
                            {item.clock_in_time ? format(new Date(item.clock_in_time), 'HH:mm') : '--'} – {item.clock_out_time ? format(new Date(item.clock_out_time), 'HH:mm') : '--'} · {(item.total_hours || 0).toFixed(1)}h
                          </p>
                          {item.notes && <p className="text-xs text-slate-400 mt-1 italic">"{item.notes}"</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => timeEntryMutation.mutate({ id: item.id, status: 'approved' })}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> OK
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => timeEntryMutation.mutate({ id: item.id, status: 'rejected' })}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Nej
                          </Button>
                        </div>
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