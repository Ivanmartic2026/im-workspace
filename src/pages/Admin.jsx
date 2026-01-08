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
  Shield, Bell, Calendar, BarChart3, Wrench, BookOpen, MapPin
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import WorkPolicyConfig from '@/components/admin/WorkPolicyConfig';
import SystemReports from '@/components/admin/SystemReports';
import AIJournalReports from '@/components/admin/AIJournalReports';
import ProjectTimeReport from '@/components/admin/ProjectTimeReport';
import EmployeeManagement from '@/components/admin/EmployeeManagement';
import PayrollExport from '@/components/admin/PayrollExport';
import NotificationSettings from '@/components/admin/NotificationSettings';
import PushNotificationTest from '@/components/admin/PushNotificationTest';
import VehicleManagement from '@/components/admin/VehicleManagement';

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Systemadministration</h1>
            <p className="text-slate-600">Översikt och inställningar för hela systemet</p>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-2xl grid grid-cols-5 gap-1 mb-6">
              <TabsTrigger value="overview" className="rounded-xl data-[state=active]:shadow-sm text-xs">
                Översikt
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="rounded-xl data-[state=active]:shadow-sm text-xs">
                Fordon
              </TabsTrigger>
              <TabsTrigger value="time" className="rounded-xl data-[state=active]:shadow-sm text-xs">
                Tid
              </TabsTrigger>
              <TabsTrigger value="journal" className="rounded-xl data-[state=active]:shadow-sm text-xs">
                Körjournal
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl data-[state=active]:shadow-sm text-xs">
                Inställningar
              </TabsTrigger>
            </TabsList>

            {/* Vehicles Tab */}
            <TabsContent value="vehicles" className="space-y-4">
              <VehicleManagement />
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* System Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <Badge variant="outline" className="bg-white/50">
                        {employees.length} aktiva
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Personal</h3>
                    <p className="text-sm text-slate-600">Hantera anställda och behörigheter</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Car className="h-6 w-6 text-emerald-600" />
                      </div>
                      <Badge variant="outline" className="bg-white/50">
                        {activeVehicles}/{vehicles.length} aktiva
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Fordon</h3>
                    <p className="text-sm text-slate-600">Fordonspark och GPS-spårning</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                      </div>
                      <Badge variant="outline" className="bg-white/50">
                        {pendingApprovals + pendingJournalEntries}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Väntande</h3>
                    <p className="text-sm text-slate-600">Godkännanden som kräver åtgärd</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Snabbåtgärder
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Link to={createPageUrl('AdminTimeSystem')}>
                    <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <span className="text-xs">Tidsystem</span>
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Employees')}>
                    <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                      <Users className="h-5 w-5" />
                      <span className="text-xs">Personal</span>
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Vehicles')}>
                    <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                      <Car className="h-5 w-5" />
                      <span className="text-xs">Fordon</span>
                    </Button>
                  </Link>
                  <Link to={createPageUrl('DrivingJournal')}>
                    <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">Körjournal</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* System Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Senaste aktivitet</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">Tidrapporter</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{timeEntries.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">Körrappporter</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{journalEntries.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">Manualer</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{manuals.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Systeminformation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">GPS-integration</span>
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aktiv
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">Databasversion</span>
                      <span className="text-sm font-semibold text-slate-900">Latest</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-600">Senaste backup</span>
                      <span className="text-sm font-semibold text-slate-900">Automatisk</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Time Management Tab */}
            <TabsContent value="time" className="space-y-4">
              <Tabs defaultValue="policies">
                <TabsList className="w-full bg-white shadow-sm">
                  <TabsTrigger value="policies">Arbetspolicies</TabsTrigger>
                  <TabsTrigger value="reports">Systemrapporter</TabsTrigger>
                  <TabsTrigger value="employees">Personalhantering</TabsTrigger>
                  <TabsTrigger value="payroll">Lönexport</TabsTrigger>
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
              <Tabs defaultValue="ai">
                <TabsList className="w-full bg-white shadow-sm">
                  <TabsTrigger value="ai">AI-rapporter</TabsTrigger>
                  <TabsTrigger value="project">Projekttid</TabsTrigger>
                  <TabsTrigger value="geofencing">Geofencing</TabsTrigger>
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

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Tabs defaultValue="notifications">
                <TabsList className="w-full bg-white shadow-sm">
                  <TabsTrigger value="notifications">Notiser</TabsTrigger>
                  <TabsTrigger value="push">Push-test</TabsTrigger>
                </TabsList>
                <TabsContent value="notifications">
                  <NotificationSettings />
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