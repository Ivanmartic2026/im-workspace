import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, 
  Send, Lock, Unlock, ChevronLeft, ChevronRight 
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, getWeek, getYear, isSameDay, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusConfig = {
  ej_klar: { label: 'Ej klar', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  klar: { label: 'Klar', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  övertid: { label: 'Övertid', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: AlertCircle }
};

const submissionStatusConfig = {
  ej_inskickad: { label: 'Ej inskickad', color: 'bg-slate-100 text-slate-700' },
  inskickad: { label: 'Inskickad', color: 'bg-blue-100 text-blue-700' },
  godkänd: { label: 'Godkänd', color: 'bg-emerald-100 text-emerald-700' },
  nekad: { label: 'Nekad / Komplettera', color: 'bg-rose-100 text-rose-700' }
};

export default function WeeklyOverview({ userEmail }) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const queryClient = useQueryClient();

  const currentDate = addWeeks(new Date(), currentWeekOffset);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const year = getYear(currentDate);

  // Fetch time entries for this week
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries', userEmail, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.filter({ 
        employee_email: userEmail 
      }, '-date', 100);
      
      return entries.filter(entry => {
        const entryDate = parseISO(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });
    },
    enabled: !!userEmail
  });

  // Calculate weekly data
  const calculateWeeklyData = () => {
    const dailyBreakdown = {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0
    };

    let totalHours = 0;

    timeEntries.forEach(entry => {
      if (entry.status === 'completed' && entry.total_hours) {
        const entryDate = parseISO(entry.date);
        const dayOfWeek = format(entryDate, 'EEEE', { locale: sv }).toLowerCase();
        const dayMap = {
          'måndag': 'monday', 'tisdag': 'tuesday', 'onsdag': 'wednesday',
          'torsdag': 'thursday', 'fredag': 'friday', 'lördag': 'saturday', 'söndag': 'sunday'
        };
        
        if (dayMap[dayOfWeek]) {
          dailyBreakdown[dayMap[dayOfWeek]] += entry.total_hours;
        }
        totalHours += entry.total_hours;
      }
    });

    const targetHours = 40;
    const remainingHours = targetHours - totalHours;
    let status = 'ej_klar';
    if (totalHours >= 40) status = totalHours === 40 ? 'klar' : 'övertid';

    return {
      reported_hours: totalHours,
      remaining_hours: remainingHours,
      status,
      daily_breakdown: dailyBreakdown,
      target_hours: targetHours
    };
  };

  const weekData = calculateWeeklyData();

  // Fetch or create weekly report
  const { data: weeklyReport } = useQuery({
    queryKey: ['weeklyReport', userEmail, weekNumber, year],
    queryFn: async () => {
      const reports = await base44.entities.WeeklyReport.filter({
        employee_email: userEmail,
        week_number: weekNumber,
        year: year
      });

      if (reports.length > 0) {
        return reports[0];
      }

      // Create new report
      return await base44.entities.WeeklyReport.create({
        employee_email: userEmail,
        week_start_date: format(weekStart, 'yyyy-MM-dd'),
        week_end_date: format(weekEnd, 'yyyy-MM-dd'),
        week_number: weekNumber,
        year: year,
        ...weekData
      });
    },
    enabled: !!userEmail
  });

  // Update weekly report
  const updateReportMutation = useMutation({
    mutationFn: async (data) => {
      if (weeklyReport?.id) {
        return await base44.entities.WeeklyReport.update(weeklyReport.id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['weeklyReport']);
    }
  });

  // Auto-update report when time entries change
  useEffect(() => {
    if (weeklyReport && !weeklyReport.is_locked) {
      updateReportMutation.mutate({
        reported_hours: weekData.reported_hours,
        remaining_hours: weekData.remaining_hours,
        status: weekData.status,
        daily_breakdown: weekData.daily_breakdown
      });
    }
  }, [timeEntries.length, weeklyReport?.id]);

  // Submit for approval
  const submitForApprovalMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.WeeklyReport.update(weeklyReport.id, {
        submission_status: 'inskickad',
        submitted_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['weeklyReport']);
      setShowSubmitDialog(false);
    }
  });

  const StatusIcon = statusConfig[weekData.status]?.icon || Clock;
  const progressPercentage = Math.min((weekData.reported_hours / weekData.target_hours) * 100, 100);

  const days = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const isCurrentWeek = currentWeekOffset === 0;
  const canSubmit = weeklyReport?.submission_status === 'ej_inskickad' && 
                    !weeklyReport?.is_locked && 
                    weekData.status !== 'ej_klar';

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <h3 className="font-semibold text-slate-900">
                Vecka {weekNumber}, {year}
              </h3>
              <p className="text-sm text-slate-500">
                {format(weekStart, 'd MMM', { locale: sv })} - {format(weekEnd, 'd MMM', { locale: sv })}
              </p>
            </div>

            <div className="flex gap-2">
              {!isCurrentWeek && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekOffset(0)}
                >
                  Idag
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                disabled={currentWeekOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <StatusIcon className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Veckorapport</h3>
                <Badge className={statusConfig[weekData.status]?.color}>
                  {statusConfig[weekData.status]?.label}
                </Badge>
              </div>
            </div>
            
            {weeklyReport?.is_locked && (
              <div className="flex items-center gap-2 text-slate-500">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Låst</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Rapporterad tid</span>
              <span className="font-semibold text-slate-900">
                {weekData.reported_hours.toFixed(1)} / {weekData.target_hours}h
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Mål</p>
              <p className="text-lg font-bold text-slate-900">{weekData.target_hours}h</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-xs text-emerald-600 mb-1">Rapporterat</p>
              <p className="text-lg font-bold text-emerald-700">{weekData.reported_hours.toFixed(1)}h</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-xs text-amber-600 mb-1">Återstår</p>
              <p className="text-lg font-bold text-amber-700">
                {weekData.remaining_hours > 0 ? weekData.remaining_hours.toFixed(1) : 0}h
              </p>
            </div>
          </div>

          {/* Submission Status */}
          {weeklyReport && (
            <div className="mb-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-600">Atteststatus</span>
                <Badge className={submissionStatusConfig[weeklyReport.submission_status]?.color}>
                  {submissionStatusConfig[weeklyReport.submission_status]?.label}
                </Badge>
              </div>
              {weeklyReport.review_comment && (
                <div className="mt-2 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-600 mb-1">Kommentar från chef</p>
                  <p className="text-sm text-blue-900">{weeklyReport.review_comment}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          {canSubmit && (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              <Send className="h-4 w-4 mr-2" />
              Skicka in för attest
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Daglig uppdelning</h3>
          <div className="space-y-2">
            {days.map((day, idx) => {
              const hours = weekData.daily_breakdown[dayKeys[idx]] || 0;
              const date = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), currentWeekOffset);
              date.setDate(date.getDate() + idx);
              const isToday = isSameDay(date, new Date());
              
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    isToday ? 'bg-slate-100 border-2 border-slate-900' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${hours > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`text-sm ${isToday ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {day}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    hours > 0 ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {hours > 0 ? `${hours.toFixed(1)}h` : '—'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skicka in veckorapport för attest</AlertDialogTitle>
            <AlertDialogDescription>
              Du är på väg att skicka in vecka {weekNumber} ({weekData.reported_hours.toFixed(1)}h) för attest. 
              Efter inskick kan du inte göra ändringar förrän rapporten har hanterats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitForApprovalMutation.mutate()}>
              Skicka in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}