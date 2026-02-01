import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isWeekend } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function MonthlyTimeView({ timeEntries, employee }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEntriesForDay = (date) => {
    return timeEntries.filter(entry => 
      isSameDay(new Date(entry.date), date) && 
      (entry.status === 'completed' || entry.status === 'approved')
    );
  };

  const calculateDayTotal = (entries) => {
    return entries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  const monthTotal = monthDays.reduce((sum, day) => {
    const entries = getEntriesForDay(day);
    return sum + calculateDayTotal(entries);
  }, 0);

  const workDaysInMonth = monthDays.filter(day => !isWeekend(day)).length;
  const expectedHours = (employee?.normal_work_hours_per_day || 8) * workDaysInMonth;
  const difference = monthTotal - expectedHours;

  // Group days by week
  const weeks = [];
  let currentWeek = [];
  monthDays.forEach((day, index) => {
    if (index === 0) {
      // Pad start of first week
      const dayOfWeek = day.getDay();
      const startPadding = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentWeek = Array(startPadding).fill(null);
    }
    
    currentWeek.push(day);
    
    if (currentWeek.length === 7 || index === monthDays.length - 1) {
      // Pad end of last week
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="font-semibold text-slate-900 text-lg">
                {format(currentMonth, 'MMMM yyyy', { locale: sv })}
              </h3>
              <p className="text-sm text-slate-500">
                {workDaysInMonth} arbetsdagar
              </p>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Arbetat</span>
              <span className="text-3xl font-bold text-slate-900">{monthTotal.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Förväntat</span>
              <span className="text-lg text-slate-600">{expectedHours}h</span>
            </div>
            <div className="h-px bg-slate-200"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Differens</span>
              <span className={`text-xl font-bold flex items-center gap-2 ${
                difference >= 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {difference >= 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5" />
                    +{difference.toFixed(1)}h
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5" />
                    {difference.toFixed(1)}h
                  </>
                )}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  monthTotal >= expectedHours ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((monthTotal / expectedHours) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              {Math.round((monthTotal / expectedHours) * 100)}% genomfört
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return <div key={`empty-${dayIndex}`} className="aspect-square" />;
                  }

                  const entries = getEntriesForDay(day);
                  const dayTotal = calculateDayTotal(entries);
                  const isToday = isSameDay(day, new Date());
                  const isWeekendDay = isWeekend(day);

                  return (
                    <motion.div
                      key={day.toISOString()}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (weekIndex * 7 + dayIndex) * 0.01 }}
                      className={`aspect-square rounded-lg p-1.5 flex flex-col items-center justify-center text-center ${
                        isToday ? 'ring-2 ring-slate-900 bg-slate-50' : 
                        isWeekendDay ? 'bg-slate-50/50' :
                        dayTotal > 0 ? 'bg-emerald-50' : 
                        'bg-white'
                      }`}
                    >
                      <span className={`text-xs font-medium ${
                        isToday ? 'text-slate-900' :
                        dayTotal > 0 ? 'text-emerald-900' : 
                        'text-slate-500'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {dayTotal > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 mt-0.5">
                          {dayTotal.toFixed(1)}h
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}