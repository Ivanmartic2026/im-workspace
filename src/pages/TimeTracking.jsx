import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ClockInOutCard from "@/components/time/ClockInOutCard.jsx";
import WeeklyTimeView from "@/components/time/WeeklyTimeView.jsx";
import LeaveRequestForm from "@/components/time/LeaveRequestForm.jsx";
import PersonalBalance from "@/components/time/PersonalBalance.jsx";
import TimeAdjustmentRequest from "@/components/time/TimeAdjustmentRequest.jsx";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, format } from "date-fns";
import { sv } from 'date-fns/locale';

export default function TimeTracking() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('stämpla');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin(window.location.pathname);
    });
  }, []);

  const { data: employee } = useQuery({
    queryKey: ['employee', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const employees = await base44.entities.Employee.list();
      return employees.find(e => e.user_email === user.email);
    },
    enabled: !!user?.email
  });

  const { data: timeEntries = [], refetch: refetchTimeEntries } = useQuery({
    queryKey: ['timeEntries', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allEntries = await base44.entities.TimeEntry.list();
      return allEntries.filter(e => e.employee_email === user.email);
    },
    enabled: !!user?.email
  });

  const activeEntry = timeEntries.find(entry => entry.status === 'active' || entry.status === 'paused');

  // Calculate weekly stats
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  
  const weeklyEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return isWithinInterval(entryDate, { start: weekStart, end: weekEnd }) && 
           (entry.status === 'completed' || entry.status === 'approved');
  });
  
  const workedHoursWeek = weeklyEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  const expectedHoursWeek = employee?.normal_work_hours_per_day * 5 || 40;
  const differenceWeek = workedHoursWeek - expectedHoursWeek;

  // Calculate daily stats
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);
  const dailyEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return isWithinInterval(entryDate, { start: dayStart, end: dayEnd }) &&
           (entry.status === 'completed' || entry.status === 'approved');
  });
  const workedHoursDay = dailyEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  const expectedHoursDay = employee?.normal_work_hours_per_day || 8;
  const differenceDay = workedHoursDay - expectedHoursDay;

  // Calculate monthly stats
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthlyEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return isWithinInterval(entryDate, { start: monthStart, end: monthEnd }) &&
           (entry.status === 'completed' || entry.status === 'approved');
  });
  const workedHoursMonth = monthlyEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  const expectedWorkDaysMonth = (() => {
    let count = 0;
    let currentDate = new Date(monthStart);
    while (currentDate <= monthEnd) {
      const day = currentDate.getDay();
      if (day !== 0 && day !== 6) count++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
  })();
  const expectedHoursMonth = (employee?.normal_work_hours_per_day || 8) * expectedWorkDaysMonth;
  const differenceMonth = workedHoursMonth - expectedHoursMonth;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-slate-900">Tidrapportering</h1>
          <p className="text-sm text-slate-500 mt-1">
            {user ? `Välkommen, ${user.full_name?.split(' ')[0]}` : 'Välkommen'}
          </p>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Idag</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Arbetat</p>
                  <p className="text-sm font-bold text-slate-900">{workedHoursDay.toFixed(1)}h</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Förväntat</p>
                  <p className="text-sm font-bold text-slate-600">{expectedHoursDay}h</p>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Differens</p>
                  <p className={`text-sm font-bold ${differenceDay >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {differenceDay >= 0 ? '+' : ''}{differenceDay.toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Veckan</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Arbetat</p>
                  <p className="text-sm font-bold text-slate-900">{workedHoursWeek.toFixed(1)}h</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Förväntat</p>
                  <p className="text-sm font-bold text-slate-600">{expectedHoursWeek}h</p>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Differens</p>
                  <p className={`text-sm font-bold ${differenceWeek >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {differenceWeek >= 0 ? '+' : ''}{differenceWeek.toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Månad ({format(today, 'MMM', { locale: sv })})</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Arbetat</p>
                  <p className="text-sm font-bold text-slate-900">{workedHoursMonth.toFixed(1)}h</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Förväntat</p>
                  <p className="text-sm font-bold text-slate-600">{expectedHoursMonth}h</p>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">Differens</p>
                  <p className={`text-sm font-bold ${differenceMonth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {differenceMonth >= 0 ? '+' : ''}{differenceMonth.toFixed(1)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 lg:grid-cols-5 mb-6">
            <TabsTrigger value="stämpla" className="text-xs lg:text-sm">Stämpla</TabsTrigger>
            <TabsTrigger value="vecka" className="text-xs lg:text-sm">Vecka</TabsTrigger>
            <TabsTrigger value="ledighet" className="text-xs lg:text-sm hidden lg:inline-flex">Ledighet</TabsTrigger>
            <TabsTrigger value="saldo" className="text-xs lg:text-sm hidden lg:inline-flex">Saldo</TabsTrigger>
            <TabsTrigger value="justera" className="text-xs lg:text-sm">Mera</TabsTrigger>
          </TabsList>

          <TabsContent value="stämpla">
            <ClockInOutCard 
              userEmail={user?.email}
              activeEntry={activeEntry}
              onUpdate={() => {
                refetchTimeEntries();
                queryClient.invalidateQueries({ queryKey: ['employees'] });
              }}
            />
          </TabsContent>

          <TabsContent value="vecka">
            <WeeklyTimeView 
              timeEntries={timeEntries}
              employee={employee}
            />
          </TabsContent>

          <TabsContent value="ledighet">
            <LeaveRequestForm 
              userEmail={user?.email}
              userName={user?.full_name}
              employee={employee}
            />
          </TabsContent>

          <TabsContent value="saldo">
            <PersonalBalance 
              employee={employee}
              timeEntries={timeEntries}
            />
          </TabsContent>

          <TabsContent value="justera">
            <div className="lg:hidden space-y-4">
              <LeaveRequestForm 
                userEmail={user?.email}
                userName={user?.full_name}
                employee={employee}
              />
              <PersonalBalance 
                employee={employee}
                timeEntries={timeEntries}
              />
              <TimeAdjustmentRequest 
                userEmail={user?.email}
                userName={user?.full_name}
                timeEntries={timeEntries}
              />
            </div>
            <div className="hidden lg:block">
              <TimeAdjustmentRequest 
                userEmail={user?.email}
                userName={user?.full_name}
                timeEntries={timeEntries}
              />
            </div>
          </TabsContent>

          <TabsContent value="justera" className="hidden">
            <TimeAdjustmentRequest 
              userEmail={user?.email}
              userName={user?.full_name}
              timeEntries={timeEntries}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}