import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MapPin, DollarSign, Clock, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function JournalDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('overview');

  const { data: entries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-created_date', 500),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: mileagePolicies = [] } = useQuery({
    queryKey: ['mileagePolicies'],
    queryFn: () => base44.entities.MileagePolicy.list(),
  });

  // Filtrera på period
  const filteredEntries = entries.filter(entry => {
    if (!entry.start_time) return false;
    const entryDate = new Date(entry.start_time);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return entryDate >= start && entryDate <= end && entry.status === 'approved' && !entry.is_deleted;
  });

  // Statistik per projekt
  const projectStats = {};
  filteredEntries.forEach(entry => {
    if (entry.project_allocations && entry.project_allocations.length > 0) {
      entry.project_allocations.forEach(allocation => {
        if (!projectStats[allocation.project_id]) {
          projectStats[allocation.project_id] = {
            name: allocation.project_name,
            trips: 0,
            distance: 0,
            duration: 0,
            cost: 0
          };
        }
        projectStats[allocation.project_id].trips += 1;
        projectStats[allocation.project_id].distance += allocation.distance_km || 0;
        projectStats[allocation.project_id].duration += (entry.duration_minutes || 0) * (allocation.percentage || 100) / 100;
      });
    } else if (entry.project_id) {
      if (!projectStats[entry.project_id]) {
        const project = projects.find(p => p.id === entry.project_id);
        projectStats[entry.project_id] = {
          name: project?.name || entry.project_code || 'Okänt projekt',
          trips: 0,
          distance: 0,
          duration: 0,
          cost: 0
        };
      }
      projectStats[entry.project_id].trips += 1;
      projectStats[entry.project_id].distance += entry.distance_km || 0;
      projectStats[entry.project_id].duration += entry.duration_minutes || 0;
      projectStats[entry.project_id].cost += entry.mileage_allowance || 0;
    }
  });

  const projectChartData = Object.values(projectStats).sort((a, b) => b.distance - a.distance).slice(0, 10);

  // Statistik per kund
  const customerStats = {};
  filteredEntries.forEach(entry => {
    if (entry.customer) {
      if (!customerStats[entry.customer]) {
        customerStats[entry.customer] = {
          name: entry.customer,
          trips: 0,
          distance: 0,
          duration: 0
        };
      }
      customerStats[entry.customer].trips += 1;
      customerStats[entry.customer].distance += entry.distance_km || 0;
      customerStats[entry.customer].duration += entry.duration_minutes || 0;
    }
  });

  const customerChartData = Object.values(customerStats).sort((a, b) => b.distance - a.distance).slice(0, 10);

  // Översiktsstatistik
  const totalDistance = filteredEntries.reduce((sum, e) => sum + (e.distance_km || 0), 0);
  const totalDuration = filteredEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const businessTrips = filteredEntries.filter(e => e.trip_type === 'tjänst').length;
  const totalMileageAllowance = filteredEntries.reduce((sum, e) => sum + (e.mileage_allowance || 0), 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D', '#C0C0C0', '#20B2AA'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Körjournal</h1>
            <p className="text-sm text-slate-500 mt-1">Översikt och analys</p>
          </div>
        </div>

        {/* Period Filter */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Denna månad</SelectItem>
                    <SelectItem value="custom">Anpassat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedPeriod === 'custom' && (
                <>
                  <div>
                    <Label className="text-xs mb-1 block">Från</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Till</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Totalt km</p>
                  <p className="text-2xl font-bold text-slate-900">{totalDistance.toFixed(0)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Resor</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredEntries.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total tid</p>
                  <p className="text-2xl font-bold text-slate-900">{Math.round(totalDuration / 60)}h</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Milersättning</p>
                  <p className="text-2xl font-bold text-slate-900">{totalMileageAllowance.toFixed(0)} kr</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="overview" className="flex-1">Översikt</TabsTrigger>
            <TabsTrigger value="projects" className="flex-1">Projekt</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1">Kunder</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Fördelning Tjänst/Privat</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Tjänst', value: filteredEntries.filter(e => e.trip_type === 'tjänst').length },
                        { name: 'Privat', value: filteredEntries.filter(e => e.trip_type === 'privat').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#a855f7" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Projekt (km)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={projectChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="distance" fill="#3b82f6" name="Kilometer" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Kunder (km)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={customerChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="distance" fill="#10b981" name="Kilometer" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}