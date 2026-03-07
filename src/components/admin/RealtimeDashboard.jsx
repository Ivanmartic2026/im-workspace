import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, Clock, TrendingUp, AlertTriangle, Download, 
  RefreshCw, Briefcase, Activity, PlayCircle, CheckCircle2,
  Calendar, BarChart3, ChevronDown, ChevronUp, MapPin
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
         eachDayOfInterval, isWithinInterval, parseISO, differenceInHours } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function RealtimeDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedSection, setExpandedSection] = useState('clocked_in');

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: timeEntries = [], refetch: refetchTimeEntries } = useQuery({
    queryKey: ['time-entries-all'],
    queryFn: () => base44.entities.TimeEntry.list(),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleRefresh = () => {
    refetchTimeEntries();
    refetchEmployees();
  };

  // ---- Computed Data ----

  // Currently clocked in
  const clockedInEntries = timeEntries.filter(e => e.status === 'active');

  const clockedInEmployees = clockedInEntries.map(entry => {
    const user = users.find(u => u.email === entry.employee_email);
    const emp = employees.find(e => e.user_email === entry.employee_email);
    const currentProjectId = entry.project_allocations?.[0]?.project_id;
    const currentProject = projects.find(p => p.id === currentProjectId);
    const hoursIn = entry.clock_in_time 
      ? differenceInHours(new Date(), new Date(entry.clock_in_time)) 
      : 0;
    return {
      name: user?.full_name || entry.employee_email,
      email: entry.employee_email,
      department: emp?.department || '',
      project: currentProject?.name || 'Inget projekt',
      clockInTime: entry.clock_in_time ? format(new Date(entry.clock_in_time), 'HH:mm') : '-',
      hoursIn,
      hasWarning: hoursIn >= 10,
      location: entry.clock_in_location?.address,
    };
  });

  // Warnings: forgotten clock-outs (active for 10+ hours)
  const forgottenClockOuts = clockedInEmployees.filter(e => e.hasWarning);

  // Week time entries
  const weekEntries = timeEntries.filter(e => e.date >= weekStart && e.date <= weekEnd);
  const monthEntries = timeEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);

  // Week days (Mon-Sun)
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  // Employee week summary
  const employeeWeekSummary = users.map(user => {
    const empEntries = weekEntries.filter(e => e.employee_email === user.email);
    const totalWeekHours = empEntries
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.total_hours || 0), 0);
    
    const dayHours = weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEntry = empEntries.find(e => e.date === dayStr && e.status === 'completed');
      return dayEntry?.total_hours || 0;
    });

    const emp = employees.find(e => e.user_email === user.email);
    const targetHours = (emp?.normal_work_hours_per_day || 8) * 5;
    const isActive = clockedInEntries.some(e => e.employee_email === user.email);

    return {
      id: user.id,
      name: user.full_name,
      email: user.email,
      department: emp?.department || '',
      totalWeekHours,
      dayHours,
      targetHours,
      progress: Math.min(100, (totalWeekHours / targetHours) * 100),
      isActive,
    };
  }).filter(e => e.name);

  // Employee month summary
  const employeeMonthSummary = users.map(user => {
    const empEntries = monthEntries.filter(e => e.employee_email === user.email);
    const totalMonthHours = empEntries
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const emp = employees.find(e => e.user_email === user.email);
    return {
      name: user.full_name,
      email: user.email,
      department: emp?.department || '',
      totalMonthHours,
    };
  }).filter(e => e.name).sort((a, b) => b.totalMonthHours - a.totalMonthHours);

  // Active projects with logged hours
  const activeProjects = projects.filter(p => p.status === 'pågående').map(project => {
    const projectEntries = timeEntries.filter(e =>
      e.project_allocations?.some(a => a.project_id === project.id)
    );
    const totalHours = projectEntries.reduce((sum, e) => {
      const alloc = e.project_allocations?.find(a => a.project_id === project.id);
      return sum + (alloc?.hours || 0);
    }, 0);
    const activePeople = clockedInEntries.filter(e =>
      e.project_allocations?.some(a => a.project_id === project.id)
    ).length;
    const budgetUsage = project.budget_hours ? (totalHours / project.budget_hours) * 100 : null;
    return { ...project, totalHours, activePeople, budgetUsage };
  }).sort((a, b) => b.activePeople - a.activePeople || b.totalHours - a.totalHours);

  // Summary stats
  const totalWeekHours = weekEntries
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + (e.total_hours || 0), 0);
  const totalMonthHours = monthEntries
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + (e.total_hours || 0), 0);

  const exportToCSV = () => {
    const headers = ['Namn', 'Avdelning', 'Veckotimmar', 'Månadstimmar', 'Status'];
    const rows = employeeWeekSummary.map(e => {
      const month = employeeMonthSummary.find(m => m.email === e.email);
      return [e.name, e.department, e.totalWeekHours.toFixed(1), 
              (month?.totalMonthHours || 0).toFixed(1), e.isActive ? 'Aktiv' : 'Inaktiv'];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const SectionHeader = ({ title, icon: Icon, count, sectionKey, color = 'slate' }) => (
    <button
      className="w-full flex items-center justify-between p-4 text-left"
      onClick={() => setExpandedSection(expandedSection === sectionKey ? null : sectionKey)}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 text-${color}-600`} />
        <span className="font-semibold text-slate-900">{title}</span>
        {count !== undefined && (
          <Badge className="bg-slate-100 text-slate-700 border-0">{count}</Badge>
        )}
      </div>
      {expandedSection === sectionKey ? 
        <ChevronUp className="h-4 w-4 text-slate-400" /> : 
        <ChevronDown className="h-4 w-4 text-slate-400" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="h-4 w-4" />
          Uppdaterad: {format(new Date(), 'HH:mm')}
          {autoRefresh && <span className="text-emerald-600 text-xs">• Live</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Uppdatera
          </Button>
          <Button 
            variant={autoRefresh ? "default" : "outline"} 
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-1" />
            Auto {autoRefresh ? 'På' : 'Av'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <PlayCircle className="h-6 w-6 text-emerald-600" />
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Live</Badge>
            </div>
            <p className="text-3xl font-bold text-slate-900">{clockedInEmployees.length}</p>
            <p className="text-xs text-slate-600 mt-0.5">Instämplade just nu</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <Clock className="h-6 w-6 text-blue-600 mb-1" />
            <p className="text-3xl font-bold text-slate-900">{totalWeekHours.toFixed(0)}h</p>
            <p className="text-xs text-slate-600 mt-0.5">Timmar denna vecka</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <Calendar className="h-6 w-6 text-purple-600 mb-1" />
            <p className="text-3xl font-bold text-slate-900">{totalMonthHours.toFixed(0)}h</p>
            <p className="text-xs text-slate-600 mt-0.5">Timmar denna månad</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${forgottenClockOuts.length > 0 ? 'bg-gradient-to-br from-amber-50 to-orange-50' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
          <CardContent className="p-4">
            <AlertTriangle className={`h-6 w-6 mb-1 ${forgottenClockOuts.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            <p className="text-3xl font-bold text-slate-900">{forgottenClockOuts.length}</p>
            <p className="text-xs text-slate-600 mt-0.5">Glömda utstämplingar</p>
          </CardContent>
        </Card>
      </div>

      {/* Forgotten clock-outs warning */}
      {forgottenClockOuts.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 mb-1">Varning – glömd utstämpling</p>
                <div className="space-y-1">
                  {forgottenClockOuts.map(e => (
                    <p key={e.email} className="text-sm text-amber-800">
                      <span className="font-medium">{e.name}</span> – instämplad kl {e.clockInTime} ({e.hoursIn}h sedan)
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clocked In Section */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <SectionHeader 
          title="Instämplade just nu" 
          icon={PlayCircle} 
          count={clockedInEmployees.length} 
          sectionKey="clocked_in"
          color="emerald"
        />
        {expandedSection === 'clocked_in' && (
          <CardContent className="pt-0 pb-4 px-4">
            {clockedInEmployees.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Ingen är instämplad just nu</p>
            ) : (
              <div className="space-y-2">
                {clockedInEmployees.map((emp, idx) => (
                  <motion.div
                    key={emp.email}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-start justify-between p-3 rounded-lg ${emp.hasWarning ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.department}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Briefcase className="h-3 w-3" />
                          {emp.project}
                        </p>
                        {emp.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {emp.location.length > 50 ? emp.location.substring(0, 50) + '…' : emp.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-800">Kl {emp.clockInTime}</p>
                      <p className={`text-xs ${emp.hasWarning ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                        {emp.hoursIn}h inne
                      </p>
                      {emp.hasWarning && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 justify-end">
                          <AlertTriangle className="h-3 w-3" /> Varning
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Active Projects Section */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <SectionHeader 
          title="Aktiva projekt" 
          icon={Briefcase} 
          count={activeProjects.length} 
          sectionKey="projects"
          color="purple"
        />
        {expandedSection === 'projects' && (
          <CardContent className="pt-0 pb-4 px-4">
            {activeProjects.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Inga aktiva projekt</p>
            ) : (
              <div className="space-y-3">
                {activeProjects.map((project, idx) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{project.name}</p>
                        <p className="text-xs text-slate-500">{project.project_code} {project.customer ? `• ${project.customer}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{project.totalHours.toFixed(1)}h</p>
                        {project.budget_hours && (
                          <p className="text-xs text-slate-500">av {project.budget_hours}h budget</p>
                        )}
                      </div>
                    </div>
                    {project.budget_hours && (
                      <Progress 
                        value={project.budgetUsage} 
                        className={`h-1.5 ${project.budgetUsage >= 90 ? '[&>div]:bg-red-500' : project.budgetUsage >= 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                      />
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      {project.budget_hours && (
                        <p className="text-xs text-slate-500">{project.budgetUsage?.toFixed(0)}% av budget</p>
                      )}
                      {project.activePeople > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs ml-auto">
                          <PlayCircle className="h-3 w-3 mr-1" />
                          {project.activePeople} aktiv{project.activePeople > 1 ? 'a' : ''}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Weekly Time Section */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <SectionHeader 
          title={`Veckotider (v. ${format(new Date(), 'w')})`}
          icon={BarChart3} 
          sectionKey="week"
          color="blue"
        />
        {expandedSection === 'week' && (
          <CardContent className="pt-0 pb-4 px-4">
            <div className="overflow-x-auto">
              {/* Day headers */}
              <div className="min-w-[500px]">
                <div className="grid grid-cols-[180px_repeat(7,1fr)_60px] gap-1 mb-2 text-xs font-medium text-slate-500 text-center px-1">
                  <div className="text-left">Medarbetare</div>
                  {weekDays.map(day => (
                    <div key={day.toISOString()} className={format(day, 'yyyy-MM-dd') === today ? 'text-blue-600 font-bold' : ''}>
                      {format(day, 'EEE', { locale: sv }).substring(0, 2)}
                      <br/>
                      <span className="text-[10px]">{format(day, 'd')}</span>
                    </div>
                  ))}
                  <div>Tot</div>
                </div>
                <div className="space-y-1">
                  {employeeWeekSummary.map(emp => (
                    <div key={emp.email} className="grid grid-cols-[180px_repeat(7,1fr)_60px] gap-1 items-center bg-white border border-slate-100 rounded-lg px-1 py-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${emp.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-xs font-medium text-slate-800 truncate">{emp.name}</span>
                      </div>
                      {emp.dayHours.map((h, i) => (
                        <div key={i} className="text-center">
                          <span className={`text-xs font-medium ${h === 0 ? 'text-slate-300' : h >= 8 ? 'text-emerald-600' : h >= 6 ? 'text-blue-600' : 'text-amber-600'}`}>
                            {h > 0 ? h.toFixed(1) : '–'}
                          </span>
                        </div>
                      ))}
                      <div className="text-center">
                        <span className={`text-xs font-bold ${emp.progress >= 100 ? 'text-emerald-600' : emp.progress >= 60 ? 'text-blue-600' : 'text-slate-700'}`}>
                          {emp.totalWeekHours.toFixed(0)}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Monthly Time Section */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <SectionHeader 
          title={`Månadsöversikt – ${format(new Date(), 'MMMM yyyy', { locale: sv })}`}
          icon={Calendar} 
          sectionKey="month"
          color="purple"
        />
        {expandedSection === 'month' && (
          <CardContent className="pt-0 pb-4 px-4">
            <div className="space-y-2">
              {employeeMonthSummary.map((emp, idx) => {
                const weekData = employeeWeekSummary.find(e => e.email === emp.email);
                const targetMonth = (weekData?.targetHours || 40) * 4;
                const pct = Math.min(100, (emp.totalMonthHours / targetMonth) * 100);
                return (
                  <motion.div
                    key={emp.email}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-slate-900">{emp.totalMonthHours.toFixed(1)}h</p>
                          <p className="text-xs text-slate-500">av ~{targetMonth}h</p>
                        </div>
                      </div>
                      <Progress 
                        value={pct}
                        className={`h-1.5 ${pct >= 100 ? '[&>div]:bg-emerald-500' : pct >= 75 ? '[&>div]:bg-blue-500' : '[&>div]:bg-amber-500'}`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}