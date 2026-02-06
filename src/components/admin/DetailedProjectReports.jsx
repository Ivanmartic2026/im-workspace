import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, User, Navigation, Clock, DollarSign, TrendingUp, Loader2, PieChart, BarChart } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import jsPDF from 'jspdf';
import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';

export default function DetailedProjectReports() {
  const [filters, setFilters] = useState({
    project_id: '',
    employee_email: '',
    start_date: '',
    end_date: ''
  });
  const [exportLoading, setExportLoading] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
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

  // Filter data
  const filteredTimeEntries = timeEntries.filter(entry => {
    const matchProject = !filters.project_id || entry.project_allocations?.some(pa => pa.project_id === filters.project_id);
    const matchEmployee = !filters.employee_email || entry.employee_email === filters.employee_email;
    const matchStartDate = !filters.start_date || new Date(entry.date) >= new Date(filters.start_date);
    const matchEndDate = !filters.end_date || new Date(entry.date) <= new Date(filters.end_date);
    return matchProject && matchEmployee && matchStartDate && matchEndDate;
  });

  const filteredJournalEntries = journalEntries.filter(entry => {
    const matchProject = !filters.project_id || entry.project_id === filters.project_id;
    const matchEmployee = !filters.employee_email || entry.driver_email === filters.employee_email;
    const matchStartDate = !filters.start_date || new Date(entry.start_time) >= new Date(filters.start_date);
    const matchEndDate = !filters.end_date || new Date(entry.start_time) <= new Date(filters.end_date);
    return matchProject && matchEmployee && matchStartDate && matchEndDate;
  });

  // Calculate statistics
  const totalHours = filteredTimeEntries.reduce((sum, entry) => {
    if (filters.project_id && entry.project_allocations) {
      const projectAllocation = entry.project_allocations.find(pa => pa.project_id === filters.project_id);
      return sum + (projectAllocation?.hours || 0);
    }
    return sum + (entry.total_hours || 0);
  }, 0);

  const totalDistance = filteredJournalEntries.reduce((sum, entry) => sum + (entry.distance_km || 0), 0);
  const totalDrivingTime = filteredJournalEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);

  const selectedProject = projects.find(p => p.id === filters.project_id);
  const projectCost = selectedProject?.hourly_rate ? totalHours * selectedProject.hourly_rate : 0;

  // Chart data - Hours per employee
  const hoursPerEmployee = filteredTimeEntries.reduce((acc, entry) => {
    const user = users.find(u => u.email === entry.employee_email);
    const name = user?.full_name || entry.employee_email;
    
    if (filters.project_id && entry.project_allocations) {
      const pa = entry.project_allocations.find(p => p.project_id === filters.project_id);
      if (pa) {
        acc[name] = (acc[name] || 0) + pa.hours;
      }
    } else {
      acc[name] = (acc[name] || 0) + (entry.total_hours || 0);
    }
    return acc;
  }, {});

  const employeeChartData = Object.entries(hoursPerEmployee)
    .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // Chart data - Category distribution
  const categoryDistribution = filteredTimeEntries.reduce((acc, entry) => {
    if (filters.project_id && entry.project_allocations) {
      const pa = entry.project_allocations.find(p => p.project_id === filters.project_id);
      if (pa) {
        acc[pa.category] = (acc[pa.category] || 0) + pa.hours;
      }
    } else {
      acc[entry.category] = (acc[entry.category] || 0) + (entry.total_hours || 0);
    }
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryDistribution)
    .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  // Distance per employee
  const distancePerEmployee = filteredJournalEntries.reduce((acc, entry) => {
    const name = entry.driver_name;
    acc[name] = (acc[name] || 0) + (entry.distance_km || 0);
    return acc;
  }, {});

  const distanceChartData = Object.entries(distancePerEmployee)
    .map(([name, km]) => ({ name, km: Number(km.toFixed(1)) }))
    .sort((a, b) => b.km - a.km)
    .slice(0, 10);

  // Export to PDF
  const exportToPDF = () => {
    setExportLoading(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Projektrapport', 20, 20);
      
      // Filters info
      doc.setFontSize(10);
      let yPos = 35;
      
      if (selectedProject) {
        doc.text(`Projekt: ${selectedProject.name} (${selectedProject.project_code})`, 20, yPos);
        yPos += 7;
      }
      
      if (filters.employee_email) {
        const user = users.find(u => u.email === filters.employee_email);
        doc.text(`Anställd: ${user?.full_name || filters.employee_email}`, 20, yPos);
        yPos += 7;
      }
      
      if (filters.start_date || filters.end_date) {
        doc.text(`Period: ${filters.start_date || 'Start'} - ${filters.end_date || 'Slut'}`, 20, yPos);
        yPos += 7;
      }
      
      doc.text(`Genererad: ${format(new Date(), 'PPP', { locale: sv })}`, 20, yPos);
      yPos += 15;
      
      // Summary
      doc.setFontSize(14);
      doc.text('Sammanfattning', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.text(`Total arbetstid: ${totalHours.toFixed(2)} timmar`, 20, yPos);
      yPos += 7;
      doc.text(`Total körsträcka: ${totalDistance.toFixed(1)} km`, 20, yPos);
      yPos += 7;
      doc.text(`Total körtid: ${Math.round(totalDrivingTime / 60)} timmar`, 20, yPos);
      yPos += 7;
      
      if (projectCost > 0) {
        doc.text(`Beräknad kostnad: ${projectCost.toFixed(2)} kr`, 20, yPos);
        yPos += 7;
      }
      
      yPos += 10;
      
      // Time entries
      if (filteredTimeEntries.length > 0) {
        doc.setFontSize(12);
        doc.text('Tidrapporter', 20, yPos);
        yPos += 10;
        
        doc.setFontSize(9);
        filteredTimeEntries.slice(0, 15).forEach(entry => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          const user = users.find(u => u.email === entry.employee_email);
          doc.text(`${entry.date} - ${user?.full_name || entry.employee_email}`, 25, yPos);
          yPos += 5;
          
          if (entry.project_allocations && filters.project_id) {
            const pa = entry.project_allocations.find(p => p.project_id === filters.project_id);
            if (pa) {
              doc.text(`  ${pa.hours}h - ${pa.category} - ${pa.notes || '-'}`, 25, yPos);
              yPos += 5;
            }
          } else {
            doc.text(`  ${entry.total_hours}h - ${entry.category}`, 25, yPos);
            yPos += 5;
          }
          
          yPos += 2;
        });
        
        if (filteredTimeEntries.length > 15) {
          doc.text(`... och ${filteredTimeEntries.length - 15} till`, 25, yPos);
          yPos += 7;
        }
      }
      
      // Journal entries
      if (filteredJournalEntries.length > 0) {
        yPos += 5;
        doc.setFontSize(12);
        doc.text('Körjournal', 20, yPos);
        yPos += 10;
        
        doc.setFontSize(9);
        filteredJournalEntries.slice(0, 15).forEach(entry => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.text(`${format(new Date(entry.start_time), 'PPP', { locale: sv })}`, 25, yPos);
          yPos += 5;
          doc.text(`  ${entry.driver_name} - ${entry.distance_km}km - ${Math.round(entry.duration_minutes)}min`, 25, yPos);
          yPos += 5;
          if (entry.purpose) {
            doc.text(`  ${entry.purpose}`, 25, yPos);
            yPos += 5;
          }
          yPos += 2;
        });
        
        if (filteredJournalEntries.length > 15) {
          doc.text(`... och ${filteredJournalEntries.length - 15} till`, 25, yPos);
        }
      }
      
      doc.save(`projektrapport_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Kunde inte exportera PDF');
    }
    setExportLoading(false);
  };

  // Export to CSV
  const exportToCSV = () => {
    setExportLoading(true);
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Header
      csvContent += 'Typ,Datum,Anställd,Projekt,Timmar,Km,Kategori,Syfte,Kommentar\n';
      
      // Time entries
      filteredTimeEntries.forEach(entry => {
        const user = users.find(u => u.email === entry.employee_email);
        const project = projects.find(p => p.id === filters.project_id);
        
        if (entry.project_allocations && filters.project_id) {
          const pa = entry.project_allocations.find(p => p.project_id === filters.project_id);
          if (pa) {
            csvContent += `Tid,${entry.date},${user?.full_name || entry.employee_email},${project?.name || ''},${pa.hours},0,${pa.category},,"${pa.notes || ''}"\n`;
          }
        } else {
          csvContent += `Tid,${entry.date},${user?.full_name || entry.employee_email},,${entry.total_hours},0,${entry.category},,"${entry.notes || ''}"\n`;
        }
      });
      
      // Journal entries
      filteredJournalEntries.forEach(entry => {
        const project = projects.find(p => p.id === entry.project_id);
        csvContent += `Körjournal,${format(new Date(entry.start_time), 'yyyy-MM-dd')},${entry.driver_name},${project?.name || ''},${(entry.duration_minutes / 60).toFixed(2)},${entry.distance_km},${entry.trip_type},"${entry.purpose || ''}","${entry.notes || ''}"\n`;
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `projektrapport_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Kunde inte exportera CSV');
    }
    setExportLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Active Filter Display */}
      {(selectedProject || filters.employee_email || filters.start_date || filters.end_date) && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Aktiv rapport</h3>
                </div>
                <div className="space-y-1">
                  {selectedProject && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/20 text-white border-white/30">
                        Projekt
                      </Badge>
                      <span className="font-semibold">{selectedProject.name}</span>
                      <span className="text-blue-100">({selectedProject.project_code})</span>
                    </div>
                  )}
                  {filters.employee_email && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/20 text-white border-white/30">
                        Anställd
                      </Badge>
                      <span className="font-semibold">
                        {users.find(u => u.email === filters.employee_email)?.full_name}
                      </span>
                    </div>
                  )}
                  {(filters.start_date || filters.end_date) && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/20 text-white border-white/30">
                        Period
                      </Badge>
                      <span className="font-semibold">
                        {filters.start_date || 'Start'} → {filters.end_date || 'Nu'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setFilters({ project_id: '', employee_email: '', start_date: '', end_date: '' })}
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                Rensa alla filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            Filtrera projektdata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700">Projekt</Label>
              <Select
                value={filters.project_id}
                onValueChange={(value) => setFilters({ ...filters, project_id: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Välj projekt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Alla projekt</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.project_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700">Anställd</Label>
              <Select
                value={filters.employee_email}
                onValueChange={(value) => setFilters({ ...filters, employee_email: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Välj anställd..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Alla anställda</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700">Startdatum</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700">Slutdatum</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Export Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-4 w-4 text-slate-600" />
              <h4 className="text-sm font-semibold text-slate-900">Exportera rapport</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={exportToCSV}
                disabled={exportLoading}
                variant="outline"
                className="h-auto py-4 flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
              >
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  {exportLoading ? (
                    <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
                  ) : (
                    <FileText className="h-6 w-6 text-emerald-600" />
                  )}
                </div>
                <div className="text-center">
                  <div className="font-semibold">CSV-fil</div>
                  <div className="text-xs text-slate-500">Excel-kompatibel</div>
                </div>
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={exportLoading}
                className="h-auto py-4 flex-col items-center gap-2 bg-gradient-to-br from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 transition-all"
              >
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  {exportLoading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <FileText className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="text-center">
                  <div className="font-semibold">PDF-dokument</div>
                  <div className="text-xs text-slate-200">Färdig rapport</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</h3>
              {selectedProject?.budget_hours && (
                <span className="text-sm text-slate-500">/ {selectedProject.budget_hours}h</span>
              )}
            </div>
            <p className="text-sm text-slate-600">Spenderad tid</p>
            {selectedProject?.budget_hours && (
              <div className="mt-3">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      totalHours > selectedProject.budget_hours 
                        ? 'bg-red-500' 
                        : totalHours > selectedProject.budget_hours * 0.8 
                        ? 'bg-amber-500' 
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min((totalHours / selectedProject.budget_hours) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {((totalHours / selectedProject.budget_hours) * 100).toFixed(0)}% förbrukat
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{totalDistance.toFixed(1)}</h3>
            <p className="text-sm text-slate-600">Kilometer körda</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{Math.round(totalDrivingTime / 60)}</h3>
            <p className="text-sm text-slate-600">Timmar i fordon</p>
          </CardContent>
        </Card>

        {projectCost > 0 && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-slate-900">{projectCost.toFixed(0)} kr</h3>
                {selectedProject?.budget_hours && selectedProject?.hourly_rate && (
                  <span className="text-sm text-slate-500">
                    / {(selectedProject.budget_hours * selectedProject.hourly_rate).toFixed(0)} kr
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600">Budget förbrukad</p>
              {selectedProject?.budget_hours && selectedProject?.hourly_rate && (
                <div className="mt-3">
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        projectCost > (selectedProject.budget_hours * selectedProject.hourly_rate) 
                          ? 'bg-red-500' 
                          : projectCost > (selectedProject.budget_hours * selectedProject.hourly_rate * 0.8) 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ 
                        width: `${Math.min((projectCost / (selectedProject.budget_hours * selectedProject.hourly_rate)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {((projectCost / (selectedProject.budget_hours * selectedProject.hourly_rate)) * 100).toFixed(0)}% av budget
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      {(employeeChartData.length > 0 || categoryChartData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hours per employee chart */}
          {employeeChartData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-slate-600" />
                  Timmar per anställd
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBar data={employeeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#3b82f6" name="Timmar" />
                  </RechartsBar>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Category distribution */}
          {categoryChartData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-slate-600" />
                  Fördelning per kategori
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Distance per employee */}
          {distanceChartData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-slate-600" />
                  Körsträcka per anställd
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBar data={distanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="km" fill="#10b981" name="Kilometer" />
                  </RechartsBar>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Project progress */}
          {selectedProject?.budget_hours && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                  Projektframsteg
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Budgeterad tid</span>
                      <span className="text-sm font-bold text-slate-900">{selectedProject.budget_hours}h</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Använd tid</span>
                      <span className="text-sm font-bold text-blue-600">{totalHours.toFixed(1)}h</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          totalHours > selectedProject.budget_hours 
                            ? 'bg-red-500' 
                            : totalHours > selectedProject.budget_hours * 0.8 
                            ? 'bg-amber-500' 
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((totalHours / selectedProject.budget_hours) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">
                        {((totalHours / selectedProject.budget_hours) * 100).toFixed(0)}% använt
                      </span>
                      <span className="text-xs text-slate-500">
                        {Math.max(0, selectedProject.budget_hours - totalHours).toFixed(1)}h kvar
                      </span>
                    </div>
                  </div>
                  
                  {selectedProject.hourly_rate && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Budget</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(selectedProject.budget_hours * selectedProject.hourly_rate).toFixed(0)} kr
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Förbrukat</span>
                        <span className="text-sm font-bold text-blue-600">{projectCost.toFixed(0)} kr</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Återstående</span>
                        <span className={`text-sm font-bold ${
                          projectCost > selectedProject.budget_hours * selectedProject.hourly_rate 
                            ? 'text-red-600' 
                            : 'text-emerald-600'
                        }`}>
                          {Math.max(0, (selectedProject.budget_hours * selectedProject.hourly_rate) - projectCost).toFixed(0)} kr
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detailed Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Entries */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              Tidrapporter ({filteredTimeEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTimeEntries.slice(0, 50).map(entry => {
                const user = users.find(u => u.email === entry.employee_email);
                const projectAllocation = filters.project_id && entry.project_allocations
                  ? entry.project_allocations.find(pa => pa.project_id === filters.project_id)
                  : null;
                
                return (
                  <div key={entry.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">
                        {user?.full_name || entry.employee_email}
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {projectAllocation?.hours || entry.total_hours}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar className="h-3 w-3" />
                      {entry.date}
                      <Badge variant="outline" className="text-xs">
                        {projectAllocation?.category || entry.category}
                      </Badge>
                    </div>
                    {(projectAllocation?.notes || entry.notes) && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {projectAllocation?.notes || entry.notes}
                      </p>
                    )}
                  </div>
                );
              })}
              {filteredTimeEntries.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">Inga tidrapporter matchar filtret</p>
              )}
              {filteredTimeEntries.length > 50 && (
                <p className="text-xs text-slate-500 text-center pt-2">
                  +{filteredTimeEntries.length - 50} till (exportera för att se alla)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Journal Entries */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4 text-slate-600" />
              Körjournal ({filteredJournalEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredJournalEntries.slice(0, 50).map(entry => (
                <div key={entry.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900">{entry.driver_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-600">{entry.distance_km}km</span>
                      <span className="text-xs text-slate-500">{Math.round(entry.duration_minutes)}min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(entry.start_time), 'PPP', { locale: sv })}
                  </div>
                  {entry.purpose && (
                    <p className="text-xs text-slate-600 line-clamp-1">{entry.purpose}</p>
                  )}
                  {entry.start_location?.address && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                      📍 {entry.start_location.address}
                    </p>
                  )}
                </div>
              ))}
              {filteredJournalEntries.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">Ingen körjournal matchar filtret</p>
              )}
              {filteredJournalEntries.length > 50 && (
                <p className="text-xs text-slate-500 text-center pt-2">
                  +{filteredJournalEntries.length - 50} till (exportera för att se alla)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}