import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, Car, Calendar, FileText, Loader2, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function DrivingJournalReports() {
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [activeTab, setActiveTab] = useState('monthly');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-created_date', 500),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: () => base44.entities.JournalPolicy.list(),
  });

  // Generate month options for last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: sv })
    };
  });

  // Filter entries for selected month
  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(new Date(selectedMonth + '-01'));

  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.start_time);
    const matchesMonth = entryDate >= monthStart && entryDate <= monthEnd;
    const matchesVehicle = selectedVehicle === 'all' || entry.vehicle_id === selectedVehicle;
    return matchesMonth && matchesVehicle;
  });

  // Calculate stats per vehicle
  const vehicleStats = vehicles.map(vehicle => {
    const vehicleEntries = filteredEntries.filter(e => e.vehicle_id === vehicle.id);
    return {
      vehicle,
      totalTrips: vehicleEntries.length,
      totalDistance: vehicleEntries.reduce((sum, e) => sum + (e.distance_km || 0), 0),
      businessTrips: vehicleEntries.filter(e => e.trip_type === 'tjänst').length,
      privateTrips: vehicleEntries.filter(e => e.trip_type === 'privat').length,
      pendingTrips: vehicleEntries.filter(e => e.trip_type === 'väntar').length,
      anomalies: vehicleEntries.filter(e => e.is_anomaly).length
    };
  }).filter(stat => stat.totalTrips > 0);

  // Get all anomalies
  const anomalies = filteredEntries.filter(e => e.is_anomaly);

  // Calculate stats per employee
  const employeeStats = employees.map(employee => {
    const employeeEntries = filteredEntries.filter(e => e.driver_email === employee.user_email);
    const businessDistance = employeeEntries.filter(e => e.trip_type === 'tjänst').reduce((sum, e) => sum + (e.distance_km || 0), 0);
    const privateDistance = employeeEntries.filter(e => e.trip_type === 'privat').reduce((sum, e) => sum + (e.distance_km || 0), 0);
    
    // Calculate cost based on policy (18.50 kr/km for business trips as example)
    const costPerKm = 18.50;
    const totalCost = businessDistance * costPerKm;

    return {
      employee,
      totalTrips: employeeEntries.length,
      totalDistance: businessDistance + privateDistance,
      businessTrips: employeeEntries.filter(e => e.trip_type === 'tjänst').length,
      privateTrips: employeeEntries.filter(e => e.trip_type === 'privat').length,
      businessDistance,
      privateDistance,
      totalCost,
      entries: employeeEntries
    };
  }).filter(stat => stat.totalTrips > 0);

  // Calculate total costs
  const totalBusinessDistance = filteredEntries.filter(e => e.trip_type === 'tjänst').reduce((sum, e) => sum + (e.distance_km || 0), 0);
  const totalCost = totalBusinessDistance * 18.50;

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportJournalPDF', {
        month: selectedMonth,
        vehicleId: selectedVehicle
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `körjournal_${selectedMonth}_${selectedVehicle === 'all' ? 'alla' : 'fordon'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Kunde inte exportera PDF: ' + error.message);
    }
    setExporting(false);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportJournalCSV', {
        month: selectedMonth,
        vehicleId: selectedVehicle
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `körjournal_${selectedMonth}_${selectedVehicle === 'all' ? 'alla' : 'fordon'}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Kunde inte exportera CSV: ' + error.message);
    }
    setExporting(false);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Ingen åtkomst</h3>
              <p className="text-slate-500">Endast administratörer kan se rapporter</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Körjournalsrapporter</h1>
            <p className="text-sm text-slate-500 mt-1">Månadsöversikter och avvikelser</p>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla fordon</SelectItem>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registration_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleExportPDF}
                  disabled={exporting || filteredEntries.length === 0}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  PDF
                </Button>
                <Button
                  onClick={handleExportCSV}
                  disabled={exporting || filteredEntries.length === 0}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="w-full bg-white shadow-sm grid grid-cols-4">
              <TabsTrigger value="monthly">
                <Car className="h-4 w-4 mr-1" />
                Fordon
              </TabsTrigger>
              <TabsTrigger value="employees">
                <BarChart3 className="h-4 w-4 mr-1" />
                Anställda
              </TabsTrigger>
              <TabsTrigger value="costs">
                <FileText className="h-4 w-4 mr-1" />
                Kostnader
              </TabsTrigger>
              <TabsTrigger value="anomalies">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Avvikelser
                {anomalies.length > 0 && (
                  <Badge className="ml-1 bg-rose-500 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">{anomalies.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Monthly Overview */}
          {activeTab === 'monthly' && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
                </div>
              ) : vehicleStats.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga resor</h3>
                    <p className="text-slate-500 text-sm">Inga körjournaler för vald period</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Summary Card */}
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-slate-900 mb-3">Sammanfattning</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-2xl font-bold text-slate-900">{filteredEntries.length}</p>
                          <p className="text-xs text-slate-600">Totalt resor</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            {filteredEntries.reduce((sum, e) => sum + (e.distance_km || 0), 0).toFixed(0)} km
                          </p>
                          <p className="text-xs text-slate-600">Total sträcka</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-emerald-600">
                            {filteredEntries.filter(e => e.trip_type === 'tjänst').length}
                          </p>
                          <p className="text-xs text-slate-600">Tjänsteresor</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-600">
                            {filteredEntries.filter(e => e.trip_type === 'privat').length}
                          </p>
                          <p className="text-xs text-slate-600">Privatresor</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Per Vehicle Stats */}
                  {vehicleStats.map(stat => (
                    <Card key={stat.vehicle.id} className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{stat.vehicle.registration_number}</CardTitle>
                            <p className="text-sm text-slate-500">
                              {stat.vehicle.make} {stat.vehicle.model}
                            </p>
                          </div>
                          {stat.anomalies > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {stat.anomalies}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xl font-bold text-slate-900">{stat.totalTrips}</p>
                            <p className="text-xs text-slate-600">Resor</p>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-xl font-bold text-blue-900">{stat.totalDistance.toFixed(0)}</p>
                            <p className="text-xs text-blue-600">km</p>
                          </div>
                          <div className="p-3 bg-emerald-50 rounded-lg">
                            <p className="text-xl font-bold text-emerald-900">{stat.businessTrips}</p>
                            <p className="text-xs text-emerald-600">Tjänst</p>
                          </div>
                        </div>
                        {stat.pendingTrips > 0 && (
                          <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-800 text-center">
                              {stat.pendingTrips} resor väntar på ifyllning
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Employees Report */}
          {activeTab === 'employees' && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
                </div>
              ) : employeeStats.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga resor</h3>
                    <p className="text-slate-500 text-sm">Inga körjournaler för vald period</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Summary Card */}
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-slate-900 mb-3">Total översikt</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-2xl font-bold text-slate-900">{employeeStats.length}</p>
                          <p className="text-xs text-slate-600">Aktiva förare</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            {employeeStats.reduce((sum, s) => sum + s.totalDistance, 0).toFixed(0)} km
                          </p>
                          <p className="text-xs text-slate-600">Total sträcka</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-emerald-600">
                            {employeeStats.reduce((sum, s) => sum + s.businessDistance, 0).toFixed(0)} km
                          </p>
                          <p className="text-xs text-slate-600">Tjänsteresor</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-600">
                            {employeeStats.reduce((sum, s) => sum + s.privateDistance, 0).toFixed(0)} km
                          </p>
                          <p className="text-xs text-slate-600">Privatresor</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Per Employee Stats */}
                  {employeeStats.sort((a, b) => b.totalDistance - a.totalDistance).map(stat => (
                    <Card key={stat.employee.user_email} className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{stat.employee.user_email}</CardTitle>
                            <p className="text-sm text-slate-500">
                              {stat.employee.department || 'Ingen avdelning'}
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-800">
                            {stat.totalTrips} resor
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xl font-bold text-slate-900">{stat.totalDistance.toFixed(0)}</p>
                              <p className="text-xs text-slate-600">Total km</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg">
                              <p className="text-xl font-bold text-emerald-900">{stat.businessDistance.toFixed(0)}</p>
                              <p className="text-xs text-emerald-600">Tjänst km</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xl font-bold text-slate-900">{stat.privateDistance.toFixed(0)}</p>
                              <p className="text-xs text-slate-600">Privat km</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm text-blue-700 font-medium">Ersättning (18.50 kr/km)</span>
                            <span className="text-lg font-bold text-blue-900">{stat.totalCost.toFixed(0)} kr</span>
                          </div>

                          <div className="flex gap-2 text-xs">
                            <div className="flex-1 text-center p-2 bg-emerald-100 rounded">
                              <span className="font-semibold text-emerald-900">{stat.businessTrips}</span>
                              <span className="text-emerald-700 ml-1">tjänst</span>
                            </div>
                            <div className="flex-1 text-center p-2 bg-slate-100 rounded">
                              <span className="font-semibold text-slate-900">{stat.privateTrips}</span>
                              <span className="text-slate-700 ml-1">privat</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Costs Report */}
          {activeTab === 'costs' && (
            <div className="space-y-3">
              {/* Total Costs Summary */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Kostnadssammanfattning</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                      <div>
                        <p className="text-sm text-slate-600">Total tjänstekörning</p>
                        <p className="text-2xl font-bold text-slate-900">{totalBusinessDistance.toFixed(0)} km</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Total ersättning</p>
                        <p className="text-2xl font-bold text-blue-600">{totalCost.toFixed(0)} kr</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Ersättning/km</p>
                        <p className="text-lg font-bold text-slate-900">18.50 kr</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Antal förare</p>
                        <p className="text-lg font-bold text-slate-900">{employeeStats.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown by Employee */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Kostnadsfördelning per anställd</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {employeeStats.sort((a, b) => b.totalCost - a.totalCost).map(stat => (
                      <div key={stat.employee.user_email} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{stat.employee.user_email}</p>
                          <p className="text-xs text-slate-500">{stat.businessDistance.toFixed(0)} km × 18.50 kr/km</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{stat.totalCost.toFixed(0)} kr</p>
                          <p className="text-xs text-slate-500">{stat.businessTrips} resor</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Policy Information */}
              {policies.length > 0 && (
                <Card className="border-0 shadow-sm bg-amber-50 border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">Policynformation</h4>
                    <p className="text-xs text-amber-800">
                      Ersättningsbelopp baseras på Skatteverkets schablon för tjänsteresor med egen bil. 
                      Automatiska beräkningar görs endast för godkända tjänsteresor.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Anomalies */}
          {activeTab === 'anomalies' && (
            <div className="space-y-3">
              {anomalies.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <AlertTriangle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga avvikelser</h3>
                    <p className="text-slate-500 text-sm">Alla resor ser normala ut</p>
                  </CardContent>
                </Card>
              ) : (
                anomalies.map(entry => {
                  const vehicle = vehicles.find(v => v.id === entry.vehicle_id);
                  return (
                    <Card key={entry.id} className="border-0 shadow-sm border-l-4 border-l-rose-500">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {vehicle?.registration_number || entry.registration_number}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {format(new Date(entry.start_time), 'PPp', { locale: sv })}
                            </p>
                          </div>
                          <Badge variant="destructive">Avvikelse</Badge>
                        </div>

                        <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 mb-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-rose-700">{entry.anomaly_reason}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500 text-xs">Sträcka</p>
                            <p className="font-semibold text-slate-900">{entry.distance_km?.toFixed(1)} km</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Tid</p>
                            <p className="font-semibold text-slate-900">{Math.round(entry.duration_minutes || 0)} min</p>
                          </div>
                          {entry.driver_name && (
                            <div className="col-span-2">
                              <p className="text-slate-500 text-xs">Förare</p>
                              <p className="font-semibold text-slate-900">{entry.driver_name}</p>
                            </div>
                          )}
                        </div>

                        {entry.purpose && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-slate-500 mb-1">Syfte:</p>
                            <p className="text-sm text-slate-700">{entry.purpose}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}