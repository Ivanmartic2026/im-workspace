import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import TeamPresence from "@/components/manager/TeamPresence.jsx";
import ApprovalQueue from "@/components/manager/ApprovalQueue.jsx";
import TeamTimeReports from "@/components/manager/TeamTimeReports.jsx";
import { motion } from "framer-motion";

export default function ManagerDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('översikt');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
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

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!employee?.is_manager
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    enabled: !!employee?.is_manager
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => base44.entities.ApprovalRequest.list('-created_date', 100),
    enabled: !!employee?.is_manager
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date', 50),
    enabled: !!employee?.is_manager
  });

  if (!employee?.is_manager && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Ingen åtkomst</h2>
            <p className="text-slate-600">Du behöver chef- eller admin-behörighet för att se denna sida.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamMembers = employee?.manages_departments?.length > 0
    ? allEmployees.filter(e => employee.manages_departments.includes(e.department))
    : allEmployees;

  const activeNow = timeEntries.filter(e => 
    (e.status === 'active' || e.status === 'paused') && 
    teamMembers.some(t => t.user_email === e.employee_email)
  );

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const pendingLeave = leaveRequests.filter(l => 
    l.status === 'pending' && 
    teamMembers.some(t => t.user_email === l.employee_email)
  );

  const anomalies = timeEntries.filter(e => 
    e.anomaly_flag && 
    teamMembers.some(t => t.user_email === e.employee_email)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-slate-900">Chef-dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Överblick för {employee?.manages_departments?.join(', ') || 'alla avdelningar'}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Instämplade nu</p>
                    <p className="text-2xl font-bold text-slate-900">{activeNow.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Väntar godkännande</p>
                    <p className="text-2xl font-bold text-slate-900">{pendingApprovals.length + pendingLeave.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Avvikelser</p>
                    <p className="text-2xl font-bold text-slate-900">{anomalies.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-rose-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Teamstorlek</p>
                    <p className="text-2xl font-bold text-slate-900">{teamMembers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-slate-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="översikt">Översikt</TabsTrigger>
            <TabsTrigger value="godkännanden">
              Godkännanden {(pendingApprovals.length + pendingLeave.length) > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                  {pendingApprovals.length + pendingLeave.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rapporter">Rapporter</TabsTrigger>
          </TabsList>

          <TabsContent value="översikt">
            <TeamPresence 
              activeEntries={activeNow}
              employees={teamMembers}
              anomalies={anomalies}
            />
          </TabsContent>

          <TabsContent value="godkännanden">
            <ApprovalQueue 
              approvals={pendingApprovals}
              leaveRequests={pendingLeave}
              employees={teamMembers}
            />
          </TabsContent>

          <TabsContent value="rapporter">
            <TeamTimeReports 
              timeEntries={timeEntries}
              employees={teamMembers}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}