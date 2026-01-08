import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Edit, Briefcase, Wrench, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, format, eachDayOfInterval, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import TimeHistoryCalendar from "./TimeHistoryCalendar";

const categoryConfig = {
  support_service: { color: "bg-blue-500", label: "Support & Service", icon: Briefcase },
  install: { color: "bg-purple-500", label: "Installation", icon: Wrench },
  interntid: { color: "bg-slate-500", label: "Interntid", icon: Zap }
};

export default function TimeHistory({ entries, onEdit }) {
  const [view, setView] = useState('week');
  const [expandedDays, setExpandedDays] = useState(new Set());
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

  const toggleExpandedDay = (dateKey) => {
    const newSet = new Set(expandedDays);
    if (newSet.has(dateKey)) {
      newSet.delete(dateKey);
    } else {
      newSet.add(dateKey);
    }
    setExpandedDays(newSet);
  };

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="w-full bg-white shadow-sm rounded-2xl p-1">
          <TabsTrigger value="week" className="flex-1 rounded-xl">Denna vecka</TabsTrigger>
          <TabsTrigger value="month" className="flex-1 rounded-xl">Denna månad</TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 rounded-xl">Kalender</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'calendar' && (
        <TimeHistoryCalendar entries={entries} />
      )}

      {view !== 'calendar' && (
        <div className="space-y-2">
          {days.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate[dateKey] || [];
            const dayTotal = getDayTotal(dayEntries);
            const isToday = isSameDay(day, now);
            const hasEntries = dayEntries.length > 0;
            const isExpanded = expandedDays.has(dateKey);

            return (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className={`border-0 shadow-sm cursor-pointer transition-all ${isToday ? 'ring-2 ring-blue-500' : ''} hover:shadow-md`}
                  onClick={() => hasEntries && toggleExpandedDay(dateKey)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
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
                      
                      <div className="flex items-center gap-3">
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
                        {hasEntries && (
                          <div className="text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {dayEntries.length > 0 && isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 mt-4 pt-4 border-t border-slate-100"
                        >
                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-xs font-medium text-slate-600">Framsteg</p>
                              <p className="text-xs font-semibold text-slate-700">{dayTotal.toFixed(1)} / 8h</p>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  dayTotal >= 8 ? 'bg-emerald-500' : dayTotal >= 6 ? 'bg-blue-500' : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min((dayTotal / 8) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Entries */}
                          {dayEntries.map((entry) => {
                            const CategoryIcon = categoryConfig[entry.category]?.icon;
                            return (
                              <motion.div 
                                key={entry.id} 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <Badge className={`${categoryConfig[entry.category]?.color} text-white shrink-0 text-xs`}>
                                    {categoryConfig[entry.category]?.label}
                                  </Badge>
                                  <div className="flex items-center gap-1.5 text-slate-600">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-sm font-medium">
                                      {format(parseISO(entry.clock_in_time), 'HH:mm')}
                                      {entry.clock_out_time && ` – ${format(parseISO(entry.clock_out_time), 'HH:mm')}`}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3 shrink-0">
                                  {entry.total_hours && (
                                    <span className="font-bold text-slate-900 text-sm min-w-[40px] text-right">{entry.total_hours.toFixed(1)}h</span>
                                  )}
                                  {entry.status === 'active' ? (
                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                                      Pågår
                                    </span>
                                  ) : onEdit && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => onEdit(entry)}
                                    >
                                      <Edit className="h-3.5 w-3.5 text-slate-400" />
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}