import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Clock, TrendingUp, AlertTriangle, Download, 
  Filter, Calendar, RefreshCw, Briefcase, Activity
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function RealtimeDashboard() {
  const [dateRange, setDateRange] = useState('today');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: timeEntries = [], refetch: refetchTimeEntries } = useQuery({
    queryKey: ['time-entries-all'],
    queryFn: () => base44.entities.TimeEntry.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchTimeEntries();
      refetchEmployees();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetchTimeEntries, refetchEmployees]);

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch(dateRange) {
      case 'today':
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'week':
        return { start: format(subDays(now, 7), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'month':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      default:
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
    }
  };

  const { start, end } = getDateRange();

  // Filter time entries by date range
  const filteredTimeEntries = timeEntries.filter(entry => {
    const entryDate = entry.date;
    return entryDate >= start && entryDate <= end;
  });

  // Active employees (clocked in right now)
  const activeEmployees = timeEntries.filter(e => e.status === 'active');
  
  // Calculate statistics
  const totalHoursWorked = filteredTimeEntries
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + (e.total_hours || 0), 0);

  const overtimeHours = filteredTimeEntries
    .filter(e => e.overtime_hours > 0)
    .reduce((sum, e) => sum + (e.overtime_hours || 0), 0);

  // Project allocations
  const projectAllocations = {};
  filteredTimeEntries.forEach(entry => {
    if (entry.project_allocations) {
      entry.project_allocations.forEach(alloc => {
        if (!projectAllocations[alloc.project_id]) {
          projectAllocations[alloc.project_id] = {
            hours: 0,
            entries: 0
          };
        }
        projectAllocations[alloc.project_id].hours += alloc.hours || 0;
        projectAllocations[alloc.project_id].entries += 1;
      });
    }
  });

  // Sort projects by hours
  const topProjects = Object.entries(projectAllocations)
    .map(([projectId, data]) => ({
      project: projects.find(p => p.id === projectId),
      ...data
    }))
    .filter(p => p.project)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const user = users.find(u => u.email === emp.user_email);
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesSearch = !searchQuery || 
      user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDepartment && matchesSearch;
  });

  // Get employee stats
  const getEmployeeStats = (empEmail) => {
    const empEntries = filteredTimeEntries.filter(e => e.employee_email === empEmail);
    const totalHours = empEntries
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const isActive = empEntries.some(e => e.status === 'active');
    const overtimeHours = empEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0);
    
    return { totalHours, isActive, overtimeHours };
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Namn', 'Email', 'Avdelning', 'Totalt (h)', 'Övertid (h)', 'Status'];
    const rows = filteredEmployees.map(emp => {
      const user = users.find(u => u.email === emp.user_email);
      const stats = getEmployeeStats(emp.user_email);
      return [
        user?.full_name || '',
        emp.user_email,
        emp.department,
        stats.totalHours.toFixed(2),
        stats.overtimeHours.toFixed(2),
        stats.isActive ? 'Aktiv' : 'Inaktiv'
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tidrapport_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Idag</SelectItem>
                  <SelectItem value="week">7 dagar</SelectItem>
                  <SelectItem value="month">Denna månad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla avdelningar</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Sök medarbetare..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchTimeEntries();
                  refetchEmployees();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Uppdatera
              </Button>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className="h-4 w-4 mr-2" />
                Auto
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportera
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-8 w-8 text-emerald-600" />
                <Badge className="bg-emerald-100 text-emerald-700 border-0">
                  Live
                </Badge>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {activeEmployees.length}
              </p>
              <p className="text-sm text-slate-600">Aktiva nu</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {totalHoursWorked.toFixed(1)}h
              </p>
              <p className="text-sm text-slate-600">Totalt arbetade timmar</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {overtimeHours.toFixed(1)}h
              </p>
              <p className="text-sm text-slate-600">Övertid</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">
                {Object.keys(projectAllocations).length}
              </p>
              <p className="text-sm text-slate-600">Aktiva projekt</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Projects */}
      {topProjects.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-600" />
              Mest aktiva projekt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProjects.map((p, idx) => (
                <div key={p.project.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {p.project.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.project.project_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {p.hours.toFixed(1)}h
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.entries} poster
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Medarbetaröversikt ({filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredEmployees.map(emp => {
              const user = users.find(u => u.email === emp.user_email);
              const stats = getEmployeeStats(emp.user_email);
              
              return (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${stats.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {user?.full_name || emp.user_email}
                    </p>
                    <p className="text-xs text-slate-500">
                      {emp.department} • {emp.job_title || 'Medarbetare'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {stats.totalHours.toFixed(1)}h
                    </p>
                    {stats.overtimeHours > 0 && (
                      <p className="text-xs text-amber-600">
                        +{stats.overtimeHours.toFixed(1)}h övertid
                      </p>
                    )}
                  </div>
                  <Badge variant={stats.isActive ? "default" : "outline"} className={stats.isActive ? "bg-emerald-100 text-emerald-700 border-0" : ""}>
                    {stats.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}