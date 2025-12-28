import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, format, eachDayOfInterval, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const categoryColors = {
  support_service: "bg-blue-500",
  install: "bg-purple-500",
  interntid: "bg-slate-500"
};

const categoryLabels = {
  support_service: "Support & Service",
  install: "Install",
  interntid: "Interntid"
};

export default function TimeHistory({ entries }) {
  const [view, setView] = useState('week');
  const now = new Date();
  
  const weekStart = startOfWeek(now, { locale: sv, weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { locale: sv, weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const interval = view === 'week' 
    ? { start: weekStart, end: weekEnd }
    : { start: monthStart, end: monthEnd };

  const filteredEntries = entries.filter(entry => {
    if (!entry.clock_in_time) return false;
    const entryDate = parseISO(entry.clock_in_time);
    return isWithinInterval(entryDate, interval);
  });

  // Group by date
  const entriesByDate = filteredEntries.reduce((acc, entry) => {
    const date = format(parseISO(entry.clock_in_time), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  const days = eachDayOfInterval(interval);

  const getDayTotal = (dayEntries) => {
    return dayEntries
      .filter(e => e.status === 'completed' && e.total_hours)
      .reduce((sum, e) => sum + e.total_hours, 0);
  };

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="w-full bg-white shadow-sm rounded-2xl p-1">
          <TabsTrigger value="week" className="flex-1 rounded-xl">Denna vecka</TabsTrigger>
          <TabsTrigger value="month" className="flex-1 rounded-xl">Denna månad</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEntries = entriesByDate[dateKey] || [];
          const dayTotal = getDayTotal(dayEntries);
          const isToday = isSameDay(day, now);
          const hasEntries = dayEntries.length > 0;

          return (
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className={`border-0 shadow-sm ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        isToday ? 'bg-blue-500' : hasEntries ? 'bg-emerald-500' : 'bg-slate-100'
                      }`}>
                        <span className={`text-sm font-bold ${
                          isToday || hasEntries ? 'text-white' : 'text-slate-400'
                        }`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                          {format(day, 'EEEE', { locale: sv })}
                        </p>
                        <p className="text-xs text-slate-500">{format(day, 'd MMMM', { locale: sv })}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {hasEntries ? (
                        <>
                          <p className="text-lg font-bold text-slate-900">{dayTotal.toFixed(1)}h</p>
                          <p className="text-xs text-slate-500">{dayEntries.length} pass</p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-400">-</p>
                      )}
                    </div>
                  </div>

                  {dayEntries.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                      {dayEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${categoryColors[entry.category]}`} />
                            <span className="text-slate-600">{categoryLabels[entry.category]}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">
                              {format(parseISO(entry.clock_in_time), 'HH:mm')}
                              {entry.clock_out_time && ` - ${format(parseISO(entry.clock_out_time), 'HH:mm')}`}
                            </span>
                            {entry.total_hours && (
                              <span className="font-semibold text-slate-900">{entry.total_hours.toFixed(1)}h</span>
                            )}
                            {entry.status === 'active' && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                Pågår
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}