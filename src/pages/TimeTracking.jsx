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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 mb-6">
            <TabsTrigger value="stämpla">Stämpla</TabsTrigger>
            <TabsTrigger value="vecka">Vecka</TabsTrigger>
            <TabsTrigger value="ledighet">Ledighet</TabsTrigger>
            <TabsTrigger value="saldo">Saldo</TabsTrigger>
            <TabsTrigger value="justera">Justera</TabsTrigger>
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