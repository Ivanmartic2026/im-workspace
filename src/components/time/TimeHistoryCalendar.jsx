import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TimeHistoryCalendar({ entries, view = 'month' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  const getDayHours = (day) => {
    return entries
      .filter(entry => {
        const entryDate = new Date(entry.clock_in_time);
        return isSameDay(entryDate, day) && (entry.status === 'completed' || entry.status === 'approved');
      })
      .reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  const getHoursColor = (hours) => {
    if (hours >= 8) return 'bg-emerald-500 text-white';
    if (hours >= 6) return 'bg-blue-500 text-white';
    if (hours > 0) return 'bg-slate-300 text-slate-700';
    return 'bg-slate-100 text-slate-400';
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const weekDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            {format(currentDate, 'MMMM yyyy', { locale: sv })}
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const dayHours = getDayHours(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
                  isCurrentMonth 
                    ? 'bg-white border border-slate-200 hover:shadow-md' 
                    : 'bg-slate-50 border border-slate-100'
                } ${
                  isToday ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <span className={`text-xs font-semibold mb-1 ${
                  isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                }`}>
                  {format(day, 'd')}
                </span>
                
                {isCurrentMonth && dayHours > 0 ? (
                  <Badge className={`text-xs font-bold ${getHoursColor(dayHours)}`}>
                    {dayHours.toFixed(1)}h
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-4 justify-center text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-emerald-500" />
            <span className="text-slate-600">8h+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-blue-500" />
            <span className="text-slate-600">6–8h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-slate-300" />
            <span className="text-slate-600">0–6h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}