import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const typeColors = {
  semester: "bg-emerald-500",
  vab: "bg-amber-500",
  sjuk: "bg-rose-500",
  tjänstledigt: "bg-violet-500",
  föräldraledigt: "bg-blue-500",
  flexuttag: "bg-indigo-500",
  annat: "bg-slate-500"
};

export default function TeamLeaveCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: approvedLeave = [] } = useQuery({
    queryKey: ['approvedLeave'],
    queryFn: () => base44.entities.LeaveRequest.filter({ status: 'approved' }),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getLeaveForDay = (day) => {
    return approvedLeave.filter(leave => {
      const startDate = new Date(leave.start_date);
      const endDate = new Date(leave.end_date);
      return isWithinInterval(day, { start: startDate, end: endDate });
    });
  };

  const getUserInfo = (email) => {
    const user = users.find(u => u.email === email);
    const employee = employees.find(e => e.user_email === email);
    return {
      name: user?.full_name || email,
      image: employee?.profile_image
    };
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-600" />
              Frånvarokalender
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold text-slate-900 min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: sv })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Idag
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const leave = getLeaveForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.005 }}
                  className={`
                    min-h-[100px] p-2 rounded-lg border transition-all
                    ${isCurrentMonth ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                  `}
                >
                  <div className={`text-xs font-medium mb-2 ${isCurrentMonth ? 'text-slate-900' : 'text-slate-400'} ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {leave.slice(0, 3).map(l => {
                      const userInfo = getUserInfo(l.employee_email);
                      return (
                        <div
                          key={l.id}
                          className={`${typeColors[l.type]} rounded px-1.5 py-0.5 text-[10px] text-white font-medium truncate`}
                          title={`${userInfo.name} - ${l.type}`}
                        >
                          {userInfo.name.split(' ')[0]}
                        </div>
                      );
                    })}
                    {leave.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        +{leave.length - 3} till
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-slate-100">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded ${color}`} />
                <span className="text-xs text-slate-600 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current month summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-600" />
            Frånvarande denna månad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {approvedLeave
              .filter(leave => {
                const startDate = new Date(leave.start_date);
                const endDate = new Date(leave.end_date);
                return isWithinInterval(monthStart, { start: startDate, end: endDate }) ||
                       isWithinInterval(monthEnd, { start: startDate, end: endDate }) ||
                       isWithinInterval(startDate, { start: monthStart, end: monthEnd });
              })
              .map(leave => {
                const userInfo = getUserInfo(leave.employee_email);
                return (
                  <div key={leave.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={userInfo.image} />
                        <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                          {getInitials(userInfo.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{userInfo.name}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(leave.start_date), 'd MMM', { locale: sv })} - {format(new Date(leave.end_date), 'd MMM', { locale: sv })}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${typeColors[leave.type]} text-white border-0 text-xs`}>
                      {leave.type}
                    </Badge>
                  </div>
                );
              })}
            {approvedLeave.filter(leave => {
              const startDate = new Date(leave.start_date);
              const endDate = new Date(leave.end_date);
              return isWithinInterval(monthStart, { start: startDate, end: endDate }) ||
                     isWithinInterval(monthEnd, { start: startDate, end: endDate }) ||
                     isWithinInterval(startDate, { start: monthStart, end: monthEnd });
            }).length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">Ingen godkänd frånvaro denna månad</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}