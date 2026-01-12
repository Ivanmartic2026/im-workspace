import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Coffee, MapPin, CheckCircle, AlertTriangle, XCircle, Edit } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import ProjectAllocationEditor from "./ProjectAllocationEditor";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Godkänd' },
  pending_review: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Väntar granskning' },
  approved: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Godkänd' },
  rejected: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Nekad' },
  needs_correction: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Behöver korrigering' },
  active: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Aktiv' }
};

export default function WeeklyTimeView({ timeEntries, employee }) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editingEntry, setEditingEntry] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      setEditingEntry(null);
    },
  });

  const handleSaveAllocation = async (allocations) => {
    if (!editingEntry) return;
    
    await updateEntryMutation.mutateAsync({
      id: editingEntry.id,
      data: {
        project_allocations: allocations
      }
    });
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const getEntriesForDay = (date) => {
    return timeEntries.filter(entry => 
      isSameDay(new Date(entry.date), date)
    );
  };

  const calculateDayTotal = (entries) => {
    return entries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  const weekTotal = weekDays.reduce((sum, day) => {
    const entries = getEntriesForDay(day);
    return sum + calculateDayTotal(entries);
  }, 0);

  const normalWeekHours = employee?.normal_work_hours_per_day * 5 || 40;
  const difference = weekTotal - normalWeekHours;

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="font-semibold text-slate-900">
                Vecka {format(currentWeek, 'w', { locale: sv })}
              </h3>
              <p className="text-sm text-slate-500">
                {format(currentWeek, 'd MMM', { locale: sv })} - {format(addDays(currentWeek, 6), 'd MMM yyyy', { locale: sv })}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* Project Allocation Editor */}
      {editingEntry && (
        <ProjectAllocationEditor
          timeEntry={editingEntry}
          projects={projects}
          onSave={handleSaveAllocation}
          onCancel={() => setEditingEntry(null)}
        />
      )}

      {/* Day by Day */}
      {!editingEntry && (
        <div className="space-y-3">
          {weekDays.map((day, index) => {
          const entries = getEntriesForDay(day);
          const dayTotal = calculateDayTotal(entries);
          const isToday = isSameDay(day, new Date());
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`border-0 shadow-sm ${isToday ? 'ring-2 ring-slate-900' : ''}`}>
                <CardHeader className={`p-4 pb-3 ${isWeekend ? 'bg-slate-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {format(day, 'EEEE', { locale: sv })}
                        {isToday && <span className="ml-2 text-xs px-2 py-0.5 bg-slate-900 text-white rounded-full">Idag</span>}
                      </h4>
                      <p className="text-sm text-slate-500">{format(day, 'd MMMM', { locale: sv })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{dayTotal.toFixed(1)}h</p>
                      {entries.length > 0 && (
                        <p className="text-xs text-slate-500">{entries.length} registrering{entries.length !== 1 ? 'ar' : ''}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {entries.length > 0 ? (
                  <CardContent className="p-4 pt-0 space-y-2">
                    {entries.map((entry) => {
                      const status = statusConfig[entry.status] || statusConfig.completed;
                      const StatusIcon = status.icon;
                      
                      return (
                        <div key={entry.id} className={`p-3 rounded-lg ${status.bg}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${status.color}`} />
                              <span className="text-sm font-medium text-slate-900">
                                {entry.category?.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {entry.total_hours?.toFixed(1)}h
                              </span>
                              {entry.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingEntry(entry)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {entry.project_allocations?.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {entry.project_allocations.map((alloc, idx) => {
                                const project = projects.find(p => p.id === alloc.project_id);
                                return (
                                  <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                                    <span>{project?.name || alloc.project_id}</span>
                                    <span className="text-indigo-600 font-bold">{alloc.hours}h</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : entry.project_id && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
                              <span>{entry.project_id}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(new Date(entry.clock_in_time), 'HH:mm')} - {' '}
                                {entry.clock_out_time ? format(new Date(entry.clock_out_time), 'HH:mm') : 'Pågår'}
                              </span>
                            </div>
                            
                            {entry.total_break_minutes > 0 && (
                              <div className="flex items-center gap-1">
                                <Coffee className="h-3 w-3" />
                                <span>{entry.total_break_minutes}m rast</span>
                              </div>
                            )}
                          </div>

                          {entry.clock_in_location && (
                            <div className="flex items-start gap-1 mt-2 text-xs text-slate-500">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{entry.clock_in_location.address}</span>
                            </div>
                          )}

                          {entry.anomaly_flag && (
                            <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-800">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              {entry.anomaly_reason || 'Avvikelse'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                ) : (
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-slate-400 text-center py-4">
                      {isWeekend ? 'Helg' : 'Ingen tid registrerad'}
                    </p>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })}
        </div>
      )}
    </div>
  );
}