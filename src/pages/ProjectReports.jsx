import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, TrendingUp, AlertTriangle, DollarSign, Calendar, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function ProjectReports() {
  const [user, setUser] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 1000),
    initialData: []
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: []
  });

  // Filter time entries based on date range and selected project
  const filteredTimeEntries = timeEntries.filter(entry => {
    // Filter by date
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;

    // Filter by project
    if (selectedProjectId !== 'all') {
      if (!entry.project_allocations || entry.project_allocations.length === 0) return false;
      return entry.project_allocations.some(alloc => alloc.project_id === selectedProjectId);
    }

    return true;
  });

  // Calculate project statistics
  const projectStats = projects.map(project => {
    const projectEntries = filteredTimeEntries.filter(entry => 
      entry.project_allocations?.some(alloc => alloc.project_id === project.id)
    );

    // Calculate total hours for this project
    const totalHours = projectEntries.reduce((sum, entry) => {
      const projectAllocation = entry.project_allocations?.find(alloc => alloc.project_id === project.id);
      return sum + (projectAllocation?.hours || 0);
    }, 0);

    // Calculate hours per employee
    const employeeHours = {};
    projectEntries.forEach(entry => {
      const projectAllocation = entry.project_allocations?.find(alloc => alloc.project_id === project.id);
      const hours = projectAllocation?.hours || 0;
      if (hours > 0) {
        employeeHours[entry.employee_email] = (employeeHours[entry.employee_email] || 0) + hours;
      }
    });

    // Calculate budget variance
    const budgetHours = project.budget_hours || 0;
    const budgetVariance = budgetHours > 0 ? totalHours - budgetHours : null;
    const budgetPercentage = budgetHours > 0 ? (totalHours / budgetHours) * 100 : null;

    // Calculate estimated cost
    const hourlyRate = project.hourly_rate || 0;
    const estimatedCost = totalHours * hourlyRate;
    const budgetCost = budgetHours * hourlyRate;

    return {
      ...project,
      totalHours: Number(totalHours.toFixed(2)),
      employeeHours,
      employeeCount: Object.keys(employeeHours).length,
      budgetVariance: budgetVariance !== null ? Number(budgetVariance.toFixed(2)) : null,
      budgetPercentage: budgetPercentage !== null ? Number(budgetPercentage.toFixed(1)) : null,
      estimatedCost: Number(estimatedCost.toFixed(2)),
      budgetCost: Number(budgetCost.toFixed(2)),
      isOverBudget: budgetVariance !== null && budgetVariance > 0
    };
  });

  // Filter projects that have activity in the selected period
  const activeProjectStats = selectedProjectId === 'all' 
    ? projectStats.filter(stat => stat.totalHours > 0)
    : projectStats.filter(stat => stat.id === selectedProjectId);

  const getEmployeeName = (email) => {
    const employee = employees.find(emp => emp.user_email === email);
    return employee?.user_email ? email.split('@')[0] : email;
  };

  const exportToCSV = () => {
    const headers = ['Projekt', 'Projektkod', 'Status', 'Total timmar', 'Budget timmar', 'Avvikelse', 'Budget %', 'Kostnad', 'Antal anställda'];
    const rows = activeProjectStats.map(stat => [
      stat.name,
      stat.project_code,
      stat.status,
      stat.totalHours,
      stat.budget_hours || 0,
      stat.budgetVariance || 0,
      stat.budgetPercentage || 0,
      stat.estimatedCost,
      stat.employeeCount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `projektrapport_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Åtkomst nekad</h2>
            <p className="text-slate-600">Endast administratörer har tillgång till projektrapporter.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total statistics
  const totalStats = {
    totalHours: activeProjectStats.reduce((sum, stat) => sum + stat.totalHours, 0),
    totalCost: activeProjectStats.reduce((sum, stat) => sum + stat.estimatedCost, 0),
    projectsOverBudget: activeProjectStats.filter(stat => stat.isOverBudget).length,
    activeProjects: activeProjectStats.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Projektrapporter</h1>
              <p className="text-slate-600 mt-1">Översikt och analys av projektens framsteg</p>
            </div>
            <Button
              onClick={exportToCSV}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportera CSV
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtrera rapporter
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Från datum</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Till datum</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Projekt</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Alla projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla projekt</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.project_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Aktiva projekt</p>
                  <p className="text-2xl font-bold text-slate-900">{totalStats.activeProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Totalt timmar</p>
                  <p className="text-2xl font-bold text-slate-900">{totalStats.totalHours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total kostnad</p>
                  <p className="text-2xl font-bold text-slate-900">{totalStats.totalCost.toLocaleString('sv-SE')} kr</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Över budget</p>
                  <p className="text-2xl font-bold text-slate-900">{totalStats.projectsOverBudget}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Details */}
        <div className="space-y-4">
          {activeProjectStats.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga projekt hittades</h3>
                <p className="text-slate-600">Justera filtren eller vänta på att tidrapporter registreras.</p>
              </CardContent>
            </Card>
          ) : (
            activeProjectStats.map((stat, index) => (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{stat.name}</CardTitle>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {stat.project_code}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            stat.status === 'pågående' ? 'bg-blue-100 text-blue-700' :
                            stat.status === 'avslutat' ? 'bg-slate-100 text-slate-700' :
                            stat.status === 'pausat' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {stat.status}
                          </span>
                        </div>
                        {stat.description && (
                          <p className="text-sm text-slate-600">{stat.description}</p>
                        )}
                        {stat.customer && (
                          <p className="text-sm text-slate-500 mt-1">Kund: {stat.customer}</p>
                        )}
                      </div>
                      {stat.isOverBudget && (
                        <div className="px-3 py-1 rounded-lg bg-rose-100 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                          <span className="text-xs font-medium text-rose-700">Över budget</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Time and Budget Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">Arbetad tid</span>
                        </div>
                        <div className="pl-6">
                          <p className="text-2xl font-bold text-slate-900">{stat.totalHours}h</p>
                          {stat.budget_hours && (
                            <p className="text-sm text-slate-600 mt-1">
                              av {stat.budget_hours}h budgeterat
                            </p>
                          )}
                        </div>
                      </div>

                      {stat.budgetPercentage !== null && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-medium">Budgetförbrukning</span>
                          </div>
                          <div className="pl-6">
                            <p className={`text-2xl font-bold ${
                              stat.budgetPercentage > 100 ? 'text-rose-600' :
                              stat.budgetPercentage > 80 ? 'text-amber-600' :
                              'text-emerald-600'
                            }`}>
                              {stat.budgetPercentage}%
                            </p>
                            {stat.budgetVariance !== null && (
                              <p className={`text-sm mt-1 ${
                                stat.budgetVariance > 0 ? 'text-rose-600' : 'text-emerald-600'
                              }`}>
                                {stat.budgetVariance > 0 ? '+' : ''}{stat.budgetVariance}h
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {stat.hourly_rate > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">Kostnad</span>
                          </div>
                          <div className="pl-6">
                            <p className="text-2xl font-bold text-slate-900">
                              {stat.estimatedCost.toLocaleString('sv-SE')} kr
                            </p>
                            {stat.budgetCost > 0 && (
                              <p className="text-sm text-slate-600 mt-1">
                                av {stat.budgetCost.toLocaleString('sv-SE')} kr budget
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Employee Hours */}
                    {Object.keys(stat.employeeHours).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                          <Users className="h-4 w-4" />
                          Timmar per anställd ({stat.employeeCount} st)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(stat.employeeHours)
                            .sort((a, b) => b[1] - a[1])
                            .map(([email, hours]) => (
                              <div key={email} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-slate-700">
                                      {getEmployeeName(email).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">
                                    {getEmployeeName(email)}
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-slate-700">
                                  {hours.toFixed(1)}h
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}