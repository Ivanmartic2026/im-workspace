import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval } from "date-fns";

export default function TimeOverview({ timeEntries, employee }) {
  const today = new Date();

  // Idag
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);
  const dailyEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return isWithinInterval(entryDate, { start: dayStart, end: dayEnd }) &&
           (entry.status === 'completed' || entry.status === 'approved');
  });
  const workedHoursDay = dailyEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  const expectedHoursDay = employee?.normal_work_hours_per_day || 8;

  // Vecka
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weeklyEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return isWithinInterval(entryDate, { start: weekStart, end: weekEnd }) && 
           (entry.status === 'completed' || entry.status === 'approved');
  });
  const workedHoursWeek = weeklyEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  const expectedHoursWeek = (employee?.normal_work_hours_per_day || 8) * 5;

  // Månad
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthlyEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return isWithinInterval(entryDate, { start: monthStart, end: monthEnd }) &&
           (entry.status === 'completed' || entry.status === 'approved');
  });
  const workedHoursMonth = monthlyEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {/* Idag */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Idag</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{workedHoursDay.toFixed(1)}h</div>
          <div className="text-xs text-slate-500 mt-1">av {expectedHoursDay}h</div>
        </CardContent>
      </Card>

      {/* Vecka */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Vecka</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{workedHoursWeek.toFixed(1)}h</div>
          <div className="text-xs text-slate-500 mt-1">av {expectedHoursWeek}h</div>
        </CardContent>
      </Card>

      {/* Månad */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-600">Månad</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{workedHoursMonth.toFixed(1)}h</div>
          <div className="text-xs text-slate-500 mt-1">totalt</div>
        </CardContent>
      </Card>
    </div>
  );
}