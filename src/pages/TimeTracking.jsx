import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import WeeklyTimeView from "@/components/time/WeeklyTimeView.jsx";
import MonthlyTimeView from "@/components/time/MonthlyTimeView.jsx";
import TimeHistoryCalendar from "@/components/time/TimeHistoryCalendar.jsx";
import LeaveRequestForm from "@/components/time/LeaveRequestForm.jsx";
import PersonalBalance from "@/components/time/PersonalBalance.jsx";
import TimeAdjustmentRequest from "@/components/time/TimeAdjustmentRequest.jsx";
import FlexRegistration from "@/components/time/FlexRegistration.jsx";
import ProjectReportView from "@/components/time/ProjectReportView.jsx";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, format } from "date-fns";
import { sv } from 'date-fns/locale';
import PullToRefresh from "@/components/mobile/PullToRefresh";

export default function TimeTracking() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('vecka');
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

  const handleRefresh = async () => {
    await refetchTimeEntries();
  };



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
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full h-auto p-1.5 bg-slate-100 rounded-2xl grid grid-cols-4 lg:grid-cols-7 gap-1 mb-8">
            <TabsTrigger value="vecka" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900">Vecka</TabsTrigger>
            <TabsTrigger value="månad" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900">Månad</TabsTrigger>
            <TabsTrigger value="projekt" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900">Projekt</TabsTrigger>
            <TabsTrigger value="flex" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900 hidden lg:inline-flex">Flex</TabsTrigger>
            <TabsTrigger value="ledighet" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900 hidden lg:inline-flex">Semester</TabsTrigger>
            <TabsTrigger value="saldo" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900 hidden lg:inline-flex">Saldo</TabsTrigger>
            <TabsTrigger value="justera" className="text-xs lg:text-sm font-medium rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=inactive]:text-slate-600 hover:text-slate-900">Ledighet</TabsTrigger>
          </TabsList>

          <TabsContent value="vecka">
            <WeeklyTimeView 
              timeEntries={timeEntries}
              employee={employee}
            />
          </TabsContent>

          <TabsContent value="månad">
            <MonthlyTimeView 
              timeEntries={timeEntries}
              employee={employee}
              userEmail={user?.email}
            />
          </TabsContent>

          <TabsContent value="projekt">
            <ProjectReportView 
              timeEntries={timeEntries}
              userEmail={user?.email}
            />
          </TabsContent>

          <TabsContent value="flex">
            <FlexRegistration
              userEmail={user?.email}
              userName={user?.full_name}
              employee={employee}
            />
          </TabsContent>

          <TabsContent value="kalender">
            <TimeHistoryCalendar entries={timeEntries} />
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
              <FlexRegistration
                userEmail={user?.email}
                userName={user?.full_name}
                employee={employee}
              />
              <LeaveRequestForm 
                userEmail={user?.email}
                userName={user?.full_name}
                employee={employee}
              />
              <PersonalBalance 
                employee={employee}
                timeEntries={timeEntries}
              />
            </div>
            <div className="hidden lg:block space-y-4">
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
    </PullToRefresh>
  );
}