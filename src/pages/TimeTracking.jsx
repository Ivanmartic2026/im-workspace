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
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

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
  
  const workedHours = weeklyEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  const expectedHours = employee?.normal_work_hours_per_day * 5 || 40;
  const difference = workedHours - expectedHours;

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

        {/* Weekly Stats Overview */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Arbetade timmar</p>
                <p className="text-2xl font-bold text-slate-900">{workedHours.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Förväntat</p>
                <p className="text-2xl font-bold text-slate-600">{expectedHours}h</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Differens</p>
                <p className={`text-2xl font-bold ${difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {difference >= 0 ? '+' : ''}{difference.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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