import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Settings, Users, Car, FileText, Clock, Database, 
  AlertCircle, CheckCircle2, Loader2, TrendingUp, 
  Shield, Bell, Calendar, BarChart3, Wrench, BookOpen, MapPin, Radio
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import WorkPolicyConfig from '@/components/admin/WorkPolicyConfig';
import SystemReports from '@/components/admin/SystemReports';
import AIJournalReports from '@/components/admin/AIJournalReports';
import ProjectTimeReport from '@/components/admin/ProjectTimeReport';
import EmployeeManagement from '@/components/admin/EmployeeManagement';
import EmployeeTimeOverview from '@/components/admin/EmployeeTimeOverview';
import PayrollExport from '@/components/admin/PayrollExport';
import NotificationSettings from '@/components/admin/NotificationSettings';
import PushNotificationTest from '@/components/admin/PushNotificationTest';
import VehicleManagement from '@/components/admin/VehicleManagement';
import StaffLocationMap from '@/components/admin/StaffLocationMap';
import BluetoothDeviceManager from '@/components/admin/BluetoothDeviceManager';
import BulkNotifications from '@/components/admin/BulkNotifications';
import AutomationSettings from '@/components/admin/AutomationSettings';
import RealtimeDashboard from '@/components/admin/RealtimeDashboard';
import DetailedProjectReports from '@/components/admin/DetailedProjectReports';
import AllVehicleReports from '@/components/admin/AllVehicleReports';
import AllFuelLogs from '@/components/admin/AllFuelLogs';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries'],
    queryFn: () => base44.entities.TimeEntry.list(),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list(),
  });

  const { data: manuals = [] } = useQuery({
    queryKey: ['manuals'],
    queryFn: () => base44.entities.Manual.list(),
  });

  const { data: approvalRequests = [] } = useQuery({
    queryKey: ['approval-requests'],
    queryFn: () => base44.entities.ApprovalRequest.list(),
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
        <Card className="max-w-md border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Åtkomst nekad</h2>
            <p className="text-slate-600 mb-6">Du behöver admin-behörighet för att komma åt denna sida.</p>
            <Link to={createPageUrl('Home')}>
              <Button>Tillbaka till hem</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingApprovals = approvalRequests.filter(r => r.status === 'pending').length;
  const pendingJournalEntries = journalEntries.filter(e => e.status === 'pending_review').length;
  const activeVehicles = vehicles.filter(v => v.status === 'aktiv').length;
  
  // Räkna totalt antal anställda (employees + users utan employee-post)
  const totalEmployees = users.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Systemadministration</h1>
            <p className="text-slate-500 text-sm">Hantera och övervaka systemet</p>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-xl grid grid-cols-2 md:grid-cols-10 gap-2 mb-8">
              <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <Database className="h-4 w-4 mr-2" />
                System
              </TabsTrigger>
              <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <TrendingUp className="h-4 w-4 mr-2" />
                Rapporter
              </TabsTrigger>
              <TabsTrigger value="employees" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <Users className="h-4 w-4 mr-2" />
                Anställda
              </TabsTrigger>
              <TabsTrigger value="time" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <Clock className="h-4 w-4 mr-2" />
                Tidsystem
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <Car className="h-4 w-4 mr-2" />
                Fordon
              </TabsTrigger>
              <TabsTrigger value="bluetooth" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <Radio className="h-4 w-4 mr-2" />
                Bluetooth
              </TabsTrigger>
              <TabsTrigger value="journal" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <FileText className="h-4 w-4 mr-2" />
                Körjournal
              </TabsTrigger>
              <TabsTrigger value="automation" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <Wrench className="h-4 w-4 mr-2" />
                Automation
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white py-3 text-sm font-medium">
                <Settings className="h-4 w-4 mr-2" />
                Inställningar
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Realtidsdashboard</h2>
              <RealtimeDashboard />
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Projektrapporter</h2>
              <DetailedProjectReports />
            </TabsContent>

            {/* Employees Tab */}
            <TabsContent value="employees" className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Anställdöversikt</h2>
              <EmployeeTimeOverview />
            </TabsContent>

            {/* Vehicles Tab */}
            <TabsContent value="vehicles" className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Fordonshantering</h2>
              <Tabs defaultValue="management">
                <TabsList className="w-full bg-white shadow-sm rounded-lg p-1 mb-4">
                  <TabsTrigger value="management" className="rounded-md">Fordonshantering</TabsTrigger>
                  <TabsTrigger value="reports" className="rounded-md">Alla rapporter</TabsTrigger>
                  <TabsTrigger value="fuel" className="rounded-md">Alla tankningar</TabsTrigger>
                  <TabsTrigger value="location" className="rounded-md">Platskarta</TabsTrigger>
                </TabsList>
                <TabsContent value="management">
                  <VehicleManagement />
                </TabsContent>
                <TabsContent value="reports">
                  <AllVehicleReports />
                </TabsContent>
                <TabsContent value="fuel">
                  <AllFuelLogs />
                </TabsContent>
                <TabsContent value="location">
                  <StaffLocationMap />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Bluetooth Tab */}
            <TabsContent value="bluetooth" className="space-y-4">
              <BluetoothDeviceManager />
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* System Status Cards */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5 text-slate-600" />
                  Systemöversikt
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link to={createPageUrl('Employees')}>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <Badge variant="outline" className="bg-white/80 text-sm font-semibold">
                            {totalEmployees}
                          </Badge>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 mb-0.5">Personal</h3>
                        <p className="text-xs text-slate-600">Aktiva medarbetare</p>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to={createPageUrl('Vehicles')}>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Car className="h-5 w-5 text-emerald-600" />
                          </div>
                          <Badge variant="outline" className="bg-white/80 text-sm font-semibold">
                            {activeVehicles}/{vehicles.length}
                          </Badge>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 mb-0.5">Fordon</h3>
                        <p className="text-xs text-slate-600">Aktiva fordon</p>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to={createPageUrl('AdminTimeSystem')}>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                          </div>
                          <Badge variant="outline" className="bg-white/80 text-sm font-semibold">
                            {pendingApprovals + pendingJournalEntries}
                          </Badge>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 mb-0.5">Väntande</h3>
                        <p className="text-xs text-slate-600">Kräver godkännande</p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-slate-600" />
                  Snabbåtgärder
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Link to={createPageUrl('AdminTimeSystem')}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer bg-white">
                      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-slate-700" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">Tidsystem</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to={createPageUrl('Employees')}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer bg-white">
                      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-slate-700" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">Personal</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to={createPageUrl('OnboardingTemplates')}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer bg-white">
                      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-slate-700" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">Onboarding</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to={createPageUrl('Vehicles')}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer bg-white">
                      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Car className="h-5 w-5 text-slate-700" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">Fordon</span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to={createPageUrl('DrivingJournal')}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer bg-white">
                      <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-slate-700" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">Körjournal</span>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>

              {/* System Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-slate-600" />
                      Aktivitet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
                          <Clock className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Tidrapporter</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{timeEntries.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
                          <FileText className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Körrapporter</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{journalEntries.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Manualer</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{manuals.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-slate-600" />
                      System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between py-2.5 px-3 bg-emerald-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">GPS-integration</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aktiv
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2.5 px-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Database</span>
                      <span className="text-sm font-semibold text-slate-900">v.Latest</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 px-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">Backup</span>
                      <span className="text-sm font-semibold text-slate-900">Automatisk</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Time Management Tab */}
            <TabsContent value="time" className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Tidsystemhantering</h2>
              <Tabs defaultValue="policies">
                <TabsList className="w-full bg-white shadow-sm rounded-lg p-1">
                  <TabsTrigger value="policies" className="rounded-md">Arbetspolicies</TabsTrigger>
                  <TabsTrigger value="reports" className="rounded-md">Rapporter</TabsTrigger>
                  <TabsTrigger value="employees" className="rounded-md">Personal</TabsTrigger>
                  <TabsTrigger value="payroll" className="rounded-md">Lönexport</TabsTrigger>
                </TabsList>
                <TabsContent value="policies">
                  <WorkPolicyConfig />
                </TabsContent>
                <TabsContent value="reports">
                  <SystemReports />
                </TabsContent>
                <TabsContent value="employees">
                  <EmployeeManagement />
                </TabsContent>
                <TabsContent value="payroll">
                  <PayrollExport />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Journal Management Tab */}
            <TabsContent value="journal" className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Körjournalhantering</h2>
              <Tabs defaultValue="ai">
                <TabsList className="w-full bg-white shadow-sm rounded-lg p-1">
                  <TabsTrigger value="ai" className="rounded-md">AI-rapporter</TabsTrigger>
                  <TabsTrigger value="project" className="rounded-md">Projekttid</TabsTrigger>
                  <TabsTrigger value="geofencing" className="rounded-md">Geofencing</TabsTrigger>
                </TabsList>
                <TabsContent value="ai">
                  <AIJournalReports />
                </TabsContent>
                <TabsContent value="project">
                  <ProjectTimeReport />
                </TabsContent>
                <TabsContent value="geofencing">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">Geofencing</h3>
                          <p className="text-sm text-slate-500 mt-1">
                            Definiera platser för automatisk klassificering av resor
                          </p>
                        </div>
                        <Link to={createPageUrl('GeofenceSettings')}>
                          <Button>
                            <MapPin className="h-4 w-4 mr-2" />
                            Hantera geofences
                          </Button>
                        </Link>
                      </div>
                      <p className="text-sm text-slate-600">
                        Skapa geografiska zoner (geofences) för kontor, kundplatser och andra platser. 
                        Resor till och från dessa platser kan automatiskt klassificeras som tjänste- eller privatresor.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="space-y-4">
              <AutomationSettings />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Systeminställningar</h2>
              <Tabs defaultValue="notifications">
                <TabsList className="w-full bg-white shadow-sm rounded-lg p-1">
                  <TabsTrigger value="notifications" className="rounded-md">Notisinställningar</TabsTrigger>
                  <TabsTrigger value="bulk" className="rounded-md">Massnotiser</TabsTrigger>
                  <TabsTrigger value="push" className="rounded-md">Push-test</TabsTrigger>
                </TabsList>
                <TabsContent value="notifications">
                  <NotificationSettings />
                </TabsContent>
                <TabsContent value="bulk">
                  <BulkNotifications />
                </TabsContent>
                <TabsContent value="push">
                  <PushNotificationTest />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}