import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function TimeHistoryCalendar({ entries, view = 'month' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  const getDayEntries = (day) => {
    return entries.filter(entry => {
      const entryDate = parseISO(entry.clock_in_time);
      return isSameDay(entryDate, day) && (entry.status === 'completed' || entry.status === 'approved');
    });
  };

  const getDayHours = (day) => {
    return getDayEntries(day).reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
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
                onClick={() => isCurrentMonth && getDayHours(day) > 0 && setSelectedDay(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all ${
                  isCurrentMonth 
                    ? 'bg-white border border-slate-200 hover:shadow-md' 
                    : 'bg-slate-50 border border-slate-100'
                } ${
                  isToday ? 'ring-2 ring-blue-500' : ''
                } ${
                  isCurrentMonth && getDayHours(day) > 0 ? 'cursor-pointer' : 'cursor-default'
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

      {/* Day Details Modal */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(selectedDay, 'EEEE d MMMM', { locale: sv })}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Totalt arbetat</span>
                <span className="text-lg font-bold text-slate-900">{getDayHours(selectedDay).toFixed(1)}h</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-900">Registreringar</h4>
                {getDayEntries(selectedDay).map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 bg-white border border-slate-200 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {format(parseISO(entry.clock_in_time), 'HH:mm')}
                          {entry.clock_out_time && ` – ${format(parseISO(entry.clock_out_time), 'HH:mm')}`}
                        </span>
                      </div>
                      <Badge variant="outline">{entry.total_hours?.toFixed(1)}h</Badge>
                    </div>
                    
                    {entry.category && (
                      <div className="text-xs text-slate-500">
                        {entry.category === 'support_service' && 'Support & Service'}
                        {entry.category === 'install' && 'Installation'}
                        {entry.category === 'rental' && 'Rental'}
                        {entry.category === 'interntid' && 'Interntid'}
                      </div>
                    )}

                    {entry.total_break_minutes > 0 && (
                      <div className="text-xs text-slate-500">
                        Rast: {entry.total_break_minutes} min
                      </div>
                    )}

                    {entry.notes && (
                      <p className="text-xs text-slate-600 italic">{entry.notes}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}