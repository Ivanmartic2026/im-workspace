import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import WorkPolicyConfig from "@/components/admin/WorkPolicyConfig.jsx";
import SystemReports from "@/components/admin/SystemReports.jsx";
import PayrollExport from "@/components/admin/PayrollExport.jsx";
import NotificationSettings from "@/components/admin/NotificationSettings.jsx";
import ProjectTimeReport from "@/components/admin/ProjectTimeReport.jsx";
import EmployeeManagement from "@/components/admin/EmployeeManagement.jsx";
import AIJournalReports from "@/components/admin/AIJournalReports.jsx";
import { motion } from "framer-motion";

export default function AdminTimeSystem() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('policies');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Ingen åtkomst</h2>
            <p className="text-slate-600">Endast administratörer har åtkomst till denna sida.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-slate-900">Systemadministration</h1>
          <p className="text-sm text-slate-500 mt-1">Hantera policys, rapporter och inställningar</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-7 mb-6">
            <TabsTrigger value="policies">Policys</TabsTrigger>
            <TabsTrigger value="reports">Rapporter</TabsTrigger>
            <TabsTrigger value="ai-journal">AI Körjournal</TabsTrigger>
            <TabsTrigger value="project-time">Tidrapport</TabsTrigger>
            <TabsTrigger value="employees">Personal</TabsTrigger>
            <TabsTrigger value="payroll">Lön</TabsTrigger>
            <TabsTrigger value="notifications">Påminnelser</TabsTrigger>
          </TabsList>

          <TabsContent value="policies">
            <WorkPolicyConfig />
          </TabsContent>

          <TabsContent value="reports">
            <SystemReports />
          </TabsContent>

          <TabsContent value="ai-journal">
            <AIJournalReports />
          </TabsContent>

          <TabsContent value="project-time">
            <ProjectTimeReport />
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeManagement />
          </TabsContent>

          <TabsContent value="payroll">
            <PayrollExport />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}