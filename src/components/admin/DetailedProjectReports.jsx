import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, User, Navigation, Clock, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import jsPDF from 'jspdf';

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
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            Filtrera projektdata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Projekt</Label>
              <Select
                value={filters.project_id}
                onValueChange={(value) => setFilters({ ...filters, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alla projekt" />
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
              <Label>Anställd</Label>
              <Select
                value={filters.employee_email}
                onValueChange={(value) => setFilters({ ...filters, employee_email: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alla anställda" />
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
              <Label>Startdatum</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Slutdatum</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setFilters({ project_id: '', employee_email: '', start_date: '', end_date: '' })}
              variant="outline"
              className="flex-1"
            >
              Rensa filter
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={exportLoading}
              variant="outline"
              className="flex-1"
            >
              {exportLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportera CSV
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={exportLoading}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              {exportLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportera PDF
            </Button>
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
            <h3 className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</h3>
            <p className="text-sm text-slate-600">Timmar arbetad tid</p>
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
              <h3 className="text-2xl font-bold text-slate-900">{projectCost.toFixed(0)} kr</h3>
              <p className="text-sm text-slate-600">Beräknad kostnad</p>
            </CardContent>
          </Card>
        )}
      </div>

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