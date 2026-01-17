import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import AdvancedReportFilters from "@/components/journal/AdvancedReportFilters";
import DistanceChart from "@/components/journal/DistanceChart";
import CostAnalysisCard from "@/components/journal/CostAnalysisCard";
import TripTypeChart from "@/components/journal/TripTypeChart";
import MonthlyTrendsChart from "@/components/journal/MonthlyTrendsChart";
import DriverStatsTable from "@/components/journal/DriverStatsTable";
import VehicleComparisonChart from "@/components/journal/VehicleComparisonChart";

export default function DrivingJournalReports() {
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    vehicleId: 'all',
    driverId: 'all',
    vehicleType: 'all',
    tripType: 'all'
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list()
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: fuelLogs = [] } = useQuery({
    queryKey: ['fuelLogs'],
    queryFn: () => base44.entities.FuelLog.list()
  });

  // Filtrera data
  const filteredData = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.start_time);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59);

      if (entryDate < startDate || entryDate > endDate) return false;
      if (filters.vehicleId !== 'all' && entry.vehicle_id !== filters.vehicleId) return false;
      if (filters.driverId !== 'all' && entry.driver_email !== filters.driverId) return false;
      if (filters.tripType !== 'all' && entry.trip_type !== filters.tripType) return false;
      
      if (filters.vehicleType !== 'all') {
        const vehicle = vehicles.find(v => v.id === entry.vehicle_id);
        if (vehicle?.vehicle_type !== filters.vehicleType) return false;
      }

      return true;
    });
  }, [entries, filters, vehicles]);

  // Beräkna data för grafer
  const chartData = useMemo(() => {
    const monthlyData = {};

    filteredData.forEach(entry => {
      const month = format(new Date(entry.start_time), 'MMM yyyy', { locale: sv });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { month, tjänst: 0, privat: 0 };
      }

      if (entry.trip_type === 'tjänst') {
        monthlyData[month].tjänst += entry.distance_km || 0;
      } else if (entry.trip_type === 'privat') {
        monthlyData[month].privat += entry.distance_km || 0;
      }
    });

    return Object.values(monthlyData).sort((a, b) => {
      return new Date(a.month) - new Date(b.month);
    });
  }, [filteredData]);

  // Trend data för månadsstatistik
  const monthlyTrendsData = useMemo(() => {
    const monthlyData = {};

    filteredData.forEach(entry => {
      const month = format(new Date(entry.start_time), 'MMM yyyy', { locale: sv });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { 
          month, 
          totalDistance: 0,
          tripCount: 0
        };
      }

      monthlyData[month].totalDistance += entry.distance_km || 0;
      monthlyData[month].tripCount += 1;
    });

    return Object.values(monthlyData).sort((a, b) => {
      return new Date(a.month) - new Date(b.month);
    });
  }, [filteredData]);

  // Resetyp-fördelning
  const tripTypeData = useMemo(() => {
    const typeCount = {
      tjänst: 0,
      privat: 0,
      väntar: 0
    };

    filteredData.forEach(entry => {
      if (typeCount.hasOwnProperty(entry.trip_type)) {
        typeCount[entry.trip_type]++;
      }
    });

    return Object.entries(typeCount)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Förarstatistik
  const driverStats = useMemo(() => {
    const stats = {};

    filteredData.forEach(entry => {
      const email = entry.driver_email || 'unknown';
      
      if (!stats[email]) {
        stats[email] = {
          driverEmail: email,
          driverName: entry.driver_name,
          tripCount: 0,
          totalDistance: 0,
          businessTrips: 0,
          privateTrips: 0
        };
      }

      stats[email].tripCount++;
      stats[email].totalDistance += entry.distance_km || 0;
      
      if (entry.trip_type === 'tjänst') stats[email].businessTrips++;
      if (entry.trip_type === 'privat') stats[email].privateTrips++;
    });

    return Object.values(stats).map(driver => ({
      ...driver,
      avgDistance: driver.tripCount > 0 ? driver.totalDistance / driver.tripCount : 0
    }));
  }, [filteredData]);

  // Fordonsdata för jämförelse
  const vehicleComparisonData = useMemo(() => {
    const vehicleData = {};

    filteredData.forEach(entry => {
      const vehicleId = entry.vehicle_id;
      
      if (!vehicleData[vehicleId]) {
        vehicleData[vehicleId] = {
          vehicleId,
          registrationNumber: entry.registration_number,
          distance: 0,
          trips: 0
        };
      }

      vehicleData[vehicleId].distance += entry.distance_km || 0;
      vehicleData[vehicleId].trips++;
    });

    return Object.values(vehicleData);
  }, [filteredData]);

  // Kostnadsanalys per fordon
  const vehicleAnalysis = useMemo(() => {
    const analysis = {};

    filteredData.forEach(entry => {
      if (!analysis[entry.vehicle_id]) {
        const vehicle = vehicles.find(v => v.id === entry.vehicle_id);
        analysis[entry.vehicle_id] = {
          vehicleId: entry.vehicle_id,
          registrationNumber: entry.registration_number,
          make: vehicle?.make,
          model: vehicle?.model,
          fuelType: vehicle?.fuel_type,
          distance: 0,
          trips: 0,
          totalCost: 0
        };
      }

      analysis[entry.vehicle_id].distance += entry.distance_km || 0;
      analysis[entry.vehicle_id].trips += 1;
    });

    // Lägg till bränslekostnader
    fuelLogs.forEach(log => {
      const logDate = new Date(log.date);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59);

      if (logDate >= startDate && logDate <= endDate) {
        if (analysis[log.vehicle_id]) {
          analysis[log.vehicle_id].totalCost += log.amount || 0;
        }
      }
    });

    return Object.values(analysis);
  }, [filteredData, fuelLogs, vehicles, filters]);

  // Sammanfattande statistik
  const summary = useMemo(() => {
    const totalDistance = filteredData.reduce((sum, e) => sum + (e.distance_km || 0), 0);
    const totalTrips = filteredData.length;
    const businessTrips = filteredData.filter(e => e.trip_type === 'tjänst').length;
    const privateTrips = filteredData.filter(e => e.trip_type === 'privat').length;
    const totalCost = vehicleAnalysis.reduce((sum, v) => sum + v.totalCost, 0);

    return {
      totalDistance,
      totalTrips,
      businessTrips,
      privateTrips,
      totalCost,
      avgCostPerKm: totalDistance > 0 ? totalCost / totalDistance : 0
    };
  }, [filteredData, vehicleAnalysis]);

  const handleClearFilters = () => {
    setFilters({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      vehicleId: 'all',
      driverId: 'all',
      vehicleType: 'all',
      tripType: 'all'
    });
  };

  const handleExport = () => {
    // Skapa CSV-data
    const headers = ['Datum', 'Fordon', 'Förare', 'Typ', 'Sträcka (km)', 'Tid (min)', 'Syfte'];
    const rows = filteredData.map(entry => [
      format(new Date(entry.start_time), 'yyyy-MM-dd HH:mm'),
      entry.registration_number,
      entry.driver_name,
      entry.trip_type,
      entry.distance_km?.toFixed(1),
      Math.round(entry.duration_minutes || 0),
      entry.purpose || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `körjournal_rapport_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Avancerade rapporter</h1>
                <p className="text-sm text-slate-500">Analys av körjournaldata</p>
              </div>
            </div>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportera CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <AdvancedReportFilters
            filters={filters}
            onFiltersChange={setFilters}
            vehicles={vehicles}
            employees={employees}
            onClear={handleClearFilters}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Total sträcka</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalDistance.toFixed(0)} km</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Antal resor</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalTrips}</p>
              <p className="text-xs text-slate-400 mt-1">
                {summary.businessTrips} tjänst · {summary.privateTrips} privat
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Total kostnad</p>
              <p className="text-2xl font-bold text-slate-900">
                {summary.totalCost.toLocaleString('sv-SE')} kr
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Snitt kr/km</p>
              <p className="text-2xl font-bold text-slate-900">
                {summary.avgCostPerKm.toFixed(2)} kr
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analysis */}
        <div className="space-y-6">
          {/* Monthly trends - full width */}
          <MonthlyTrendsChart data={monthlyTrendsData} />

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistanceChart data={chartData} />
            <TripTypeChart data={tripTypeData} />
          </div>

          {/* Vehicle comparison and cost */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VehicleComparisonChart data={vehicleComparisonData} />
            <CostAnalysisCard vehicleAnalysis={vehicleAnalysis} />
          </div>

          {/* Driver stats - full width */}
          <DriverStatsTable driverStats={driverStats} />
        </div>
      </div>
    </div>
  );
}