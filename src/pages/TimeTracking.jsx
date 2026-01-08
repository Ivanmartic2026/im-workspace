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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Idag - Secondary */}
          <Card className="border-0 bg-white/50 shadow-none">
            <CardContent className="p-3">
              <h3 className="text-xs font-medium text-slate-600 mb-2">Idag</h3>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <p className="text-xs text-slate-500">Arbetat</p>
                  <p className="text-xs font-semibold text-slate-800">{workedHoursDay.toFixed(1)}h</p>
                </div>
                <div className="flex justify-between items-baseline">
                  <p className="text-xs text-slate-500">Förväntat</p>
                  <p className="text-xs text-slate-600">{expectedHoursDay}h</p>
                </div>
                <div className="h-px bg-slate-100 my-1.5"></div>
                <div className="flex justify-between items-baseline">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className={`text-xs font-semibold ${differenceDay >= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {differenceDay >= 0 ? `+${differenceDay.toFixed(1)}h` : `${differenceDay.toFixed(1)}h kvar`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Veckan - Primary */}
          <Card className="border-0 shadow-lg md:col-span-1">
            <CardContent className="p-5">
              <h3 className="text-base font-bold text-slate-900 mb-4">Veckan</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-xs text-slate-600">Arbetat / Förväntat</p>
                    <p className="text-lg font-bold text-slate-900">{workedHoursWeek.toFixed(1)} / {expectedHoursWeek}h</p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all ${
                        workedHoursWeek >= expectedHoursWeek ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min((workedHoursWeek / expectedHoursWeek) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{Math.round((workedHoursWeek / expectedHoursWeek) * 100)}% genomfört</p>
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex justify-between items-baseline pt-1">
                  <p className="text-xs text-slate-600">Status</p>
                  <p className={`text-base font-bold ${
                    differenceWeek > 5 ? 'text-emerald-600' : 
                    differenceWeek >= 0 ? 'text-blue-600' : 
                    'text-amber-600'
                  }`}>
                    {differenceWeek > 0 ? `+${differenceWeek.toFixed(1)}h` : `${Math.abs(differenceWeek).toFixed(1)}h kvar`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Månad - Secondary */}
          <Card className="border-0 bg-white/50 shadow-none">
            <CardContent className="p-3">
              <h3 className="text-xs font-medium text-slate-600 mb-2">Månad ({format(today, 'MMM', { locale: sv })})</h3>
              {expectedHoursMonth > 0 && workedHoursMonth / expectedHoursMonth < 0.3 ? (
                <div className="text-xs text-slate-600 py-1">
                  <p className="font-medium">Månad pågår</p>
                  <p className="text-slate-500 mt-1">{Math.round((workedHoursMonth / expectedHoursMonth) * 100)}% klart</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <p className="text-xs text-slate-500">Arbetat</p>
                    <p className="text-xs font-semibold text-slate-800">{workedHoursMonth.toFixed(1)}h</p>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <p className="text-xs text-slate-500">Förväntat</p>
                    <p className="text-xs text-slate-600">{expectedHoursMonth}h</p>
                  </div>
                  <div className="h-px bg-slate-100 my-1.5"></div>
                  <div className="flex justify-between items-baseline">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className={`text-xs font-semibold ${differenceMonth >= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {differenceMonth >= 0 ? `+${differenceMonth.toFixed(1)}h` : `${differenceMonth.toFixed(1)}h`}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-10">
          <TabsList className="w-full h-auto p-1.5 bg-slate-100 rounded-2xl grid grid-cols-3 lg:grid-cols-5 gap-1 mb-8">
            <TabsTrigger value="stämpla" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900">Stämpla</TabsTrigger>
            <TabsTrigger value="vecka" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900">Vecka</TabsTrigger>
            <TabsTrigger value="ledighet" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900 hidden lg:inline-flex">Ledighet</TabsTrigger>
            <TabsTrigger value="saldo" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900 hidden lg:inline-flex">Saldo</TabsTrigger>
            <TabsTrigger value="justera" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900">Mera</TabsTrigger>
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