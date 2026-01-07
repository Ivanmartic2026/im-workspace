import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fuel, Navigation, Clock, TrendingUp, Car, Users } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from "date-fns";
import { sv } from "date-fns/locale";

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: fuelLogs = [] } = useQuery({
    queryKey: ['fuelLogs'],
    queryFn: () => base44.entities.FuelLog.list('-date', 500),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 500),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Beräkna period
  const today = new Date();
  let startDate, endDate;
  if (selectedPeriod === 'week') {
    startDate = startOfWeek(today, { locale: sv });
    endDate = endOfWeek(today, { locale: sv });
  } else {
    startDate = startOfMonth(today);
    endDate = endOfMonth(today);
  }

  // Filtrera fordon-data
  const filteredFuelLogs = fuelLogs.filter(log => {
    const logDate = new Date(log.date);
    const matchesPeriod = logDate >= startDate && logDate <= endDate;
    const matchesVehicle = selectedVehicle === 'all' || log.vehicle_id === selectedVehicle;
    return matchesPeriod && matchesVehicle;
  });

  // Tankningsstatistik per fordon
  const vehicleStats = vehicles.map(vehicle => {
    const vehicleLogs = filteredFuelLogs.filter(log => log.vehicle_id === vehicle.id);
    const totalAmount = vehicleLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
    const totalLiters = vehicleLogs.reduce((sum, log) => sum + (log.liters || 0), 0);
    const kmDriven = vehicleLogs.length > 1
      ? Math.max(...vehicleLogs.map(l => l.mileage)) - Math.min(...vehicleLogs.map(l => l.mileage))
      : 0;

    return {
      vehicle,
      fuelCount: vehicleLogs.length,
      totalAmount,
      totalLiters,
      kmDriven,
    };
  }).filter(stat => stat.fuelCount > 0 || selectedVehicle === stat.vehicle.id);

  // Filtrera tidrapporter
  const filteredTimeEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const matchesPeriod = entryDate >= startDate && entryDate <= endDate;
    const matchesEmployee = selectedEmployee === 'all' || entry.employee_email === selectedEmployee;
    return matchesPeriod && matchesEmployee && entry.status === 'completed';
  });

  // Tidrapportstatistik per anställd
  const employeeTimeStats = employees.map(employee => {
    const employeeEntries = filteredTimeEntries.filter(e => e.employee_email === employee.user_email);
    const totalHours = employeeEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
    // Samla alla kategorier från både entry.category och project_allocations
    const categoryHours = { support_service: 0, install: 0, rental: 0, interntid: 0 };
    
    employeeEntries.forEach(entry => {
      if (entry.project_allocations?.length > 0) {
        entry.project_allocations.forEach(alloc => {
          if (alloc.category && categoryHours.hasOwnProperty(alloc.category)) {
            categoryHours[alloc.category] += alloc.hours || 0;
          }
        });
      } else if (entry.category && categoryHours.hasOwnProperty(entry.category)) {
        categoryHours[entry.category] += entry.total_hours || 0;
      }
    });

    const byCategory = categoryHours;

    return {
      employee,
      totalHours,
      entryCount: employeeEntries.length,
      byCategory,
    };
  }).filter(stat => stat.entryCount > 0 || selectedEmployee === stat.employee.user_email);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Rapporter</h1>

          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedPeriod === 'week'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Denna vecka
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedPeriod === 'month'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Denna månad
            </button>
          </div>

          <Tabs defaultValue="vehicles" className="space-y-4">
            <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-2xl grid grid-cols-2">
              <TabsTrigger value="vehicles" className="rounded-xl data-[state=active]:shadow-sm">
                Fordon
              </TabsTrigger>
              <TabsTrigger value="time" className="rounded-xl data-[state=active]:shadow-sm">
                Tid
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vehicles" className="space-y-4">
              {/* Vehicle Filter */}
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Välj fordon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla fordon</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} - {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Fuel className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Tankningar</p>
                        <p className="text-xl font-bold text-slate-900">{filteredFuelLogs.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Totalt belopp</p>
                        <p className="text-xl font-bold text-slate-900">
                          {filteredFuelLogs.reduce((sum, log) => sum + (log.amount || 0), 0).toLocaleString()} kr
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Vehicle Stats */}
              <div className="space-y-3">
                {vehicleStats.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <Car className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Ingen data för vald period</p>
                    </CardContent>
                  </Card>
                ) : (
                  vehicleStats.map((stat, idx) => (
                    <Card key={stat.vehicle.id} className="border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{stat.vehicle.registration_number}</h3>
                            <p className="text-xs text-slate-500">{stat.vehicle.make} {stat.vehicle.model}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">{stat.fuelCount}</p>
                            <p className="text-xs text-slate-500">tankningar</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Belopp</p>
                            <p className="font-semibold text-slate-900">{stat.totalAmount.toLocaleString()} kr</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Liter</p>
                            <p className="font-semibold text-slate-900">{stat.totalLiters.toFixed(1)} L</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">KM</p>
                            <p className="font-semibold text-slate-900">{stat.kmDriven.toLocaleString()} km</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="time" className="space-y-4">
              {/* Employee Filter */}
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Välj anställd" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla anställda</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.user_email}>
                      {e.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Summary */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Totala timmar</p>
                      <p className="text-xl font-bold text-slate-900">
                        {filteredTimeEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0).toFixed(1)} h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Stats */}
              <div className="space-y-3">
                {employeeTimeStats.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Ingen data för vald period</p>
                    </CardContent>
                  </Card>
                ) : (
                  employeeTimeStats.map((stat) => (
                    <Card key={stat.employee.id} className="border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{stat.employee.user_email}</h3>
                            <p className="text-xs text-slate-500">{stat.employee.job_title || 'Ingen titel'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">{stat.totalHours.toFixed(1)} h</p>
                            <p className="text-xs text-slate-500">{stat.entryCount} registreringar</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Support</p>
                            <p className="font-semibold text-slate-900">{stat.byCategory.support_service.toFixed(1)} h</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Install</p>
                            <p className="font-semibold text-slate-900">{stat.byCategory.install.toFixed(1)} h</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Rental</p>
                            <p className="font-semibold text-slate-900">{stat.byCategory.rental.toFixed(1)} h</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Intern</p>
                            <p className="font-semibold text-slate-900">{stat.byCategory.interntid.toFixed(1)} h</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}