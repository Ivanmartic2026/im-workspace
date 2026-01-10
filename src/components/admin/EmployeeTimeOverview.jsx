import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Search, Calendar, TrendingUp, Briefcase } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { sv } from "date-fns/locale";

export default function EmployeeTimeOverview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [quickFilter, setQuickFilter] = useState('month');

  const applyQuickFilter = (filter) => {
    setQuickFilter(filter);
    const now = new Date();
    switch(filter) {
      case 'today':
        setStartDate(format(startOfDay(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfDay(now), 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
    }
  };

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: []
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries', selectedEmployee?.user_email, startDate, endDate],
    queryFn: async () => {
      if (!selectedEmployee) return [];
      const entries = await base44.entities.TimeEntry.filter({
        employee_email: selectedEmployee.user_email
      });
      return entries.filter(e => {
        const entryDate = new Date(e.date);
        return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
      });
    },
    enabled: !!selectedEmployee,
    initialData: []
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  const enrichedEmployees = employees.map(emp => {
    const user = users.find(u => u.email === emp.user_email);
    return { ...emp, user };
  }).filter(emp => emp.user);

  const filteredEmployees = enrichedEmployees.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    return emp.user.full_name?.toLowerCase().includes(searchLower) ||
           emp.user.email?.toLowerCase().includes(searchLower) ||
           emp.department?.toLowerCase().includes(searchLower);
  });

  const calculateStats = () => {
    if (!timeEntries.length) return { totalHours: 0, projects: {} };

    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
    const projectMap = {};

    timeEntries.forEach(entry => {
      if (entry.project_allocations) {
        entry.project_allocations.forEach(alloc => {
          const project = projects.find(p => p.id === alloc.project_id);
          const projectName = project?.name || alloc.project_id;
          if (!projectMap[projectName]) {
            projectMap[projectName] = { hours: 0, count: 0 };
          }
          projectMap[projectName].hours += alloc.hours;
          projectMap[projectName].count += 1;
        });
      }
    });

    return { totalHours, projects: projectMap };
  };

  const stats = selectedEmployee ? calculateStats() : null;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Anställdöversikt
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              {filteredEmployees.length} anställda
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={quickFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyQuickFilter('today')}
              className={quickFilter === 'today' ? 'bg-slate-900' : ''}
            >
              Idag
            </Button>
            <Button
              variant={quickFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyQuickFilter('week')}
              className={quickFilter === 'week' ? 'bg-slate-900' : ''}
            >
              1V
            </Button>
            <Button
              variant={quickFilter === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyQuickFilter('month')}
              className={quickFilter === 'month' ? 'bg-slate-900' : ''}
            >
              Denna månad
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök på namn, email eller avdelning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEmployees.map(emp => (
              <Card
                key={emp.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedEmployee(emp)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{emp.user.full_name}</h3>
                      <p className="text-sm text-slate-500">{emp.user.email}</p>
                    </div>
                    <Badge className={emp.user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                      {emp.user.role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
                  </div>
                  {emp.department && (
                    <p className="text-xs text-slate-600 mt-2">
                      📂 {emp.department}
                    </p>
                  )}
                  {emp.job_title && (
                    <p className="text-xs text-slate-600">
                      💼 {emp.job_title}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Inga anställda hittades</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Detail Modal */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedEmployee?.user.full_name} - Tidrapporter
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quick Filters */}
            <div className="flex gap-2">
              <Button
                variant={quickFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyQuickFilter('today')}
                className={quickFilter === 'today' ? 'bg-slate-900' : ''}
              >
                Idag
              </Button>
              <Button
                variant={quickFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyQuickFilter('week')}
                className={quickFilter === 'week' ? 'bg-slate-900' : ''}
              >
                1V
              </Button>
              <Button
                variant={quickFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyQuickFilter('month')}
                className={quickFilter === 'month' ? 'bg-slate-900' : ''}
              >
                Denna månad
              </Button>
            </div>

            {/* Date Range Selector */}
            <Card className="border-0 shadow-sm bg-slate-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Från datum</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setQuickFilter(null);
                      }}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Till datum</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setQuickFilter(null);
                      }}
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalHours.toFixed(1)}h</p>
                        <p className="text-xs text-slate-600">Total arbetstid</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{timeEntries.length}</p>
                        <p className="text-xs text-slate-600">Arbetsdagar</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{Object.keys(stats.projects).length}</p>
                        <p className="text-xs text-slate-600">Projekt</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Project Breakdown */}
            {stats && Object.keys(stats.projects).length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Projektfördelning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.projects).map(([projectName, data]) => (
                    <div key={projectName} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{projectName}</p>
                        <p className="text-xs text-slate-500">{data.count} registreringar</p>
                      </div>
                      <Badge variant="outline" className="text-sm font-semibold">
                        {data.hours.toFixed(1)}h
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Time Entries List */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tidrapporter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {timeEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">Inga tidrapporter för vald period</p>
                  </div>
                ) : (
                  timeEntries.map(entry => (
                    <div key={entry.id} className="p-3 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {format(new Date(entry.date), 'EEEE d MMMM yyyy', { locale: sv })}
                          </p>
                          <p className="text-sm text-slate-500">
                            {entry.clock_in_time && format(new Date(entry.clock_in_time), 'HH:mm')} - 
                            {entry.clock_out_time && format(new Date(entry.clock_out_time), 'HH:mm')}
                          </p>
                        </div>
                        <Badge variant="outline" className="font-semibold">
                          {entry.total_hours?.toFixed(1)}h
                        </Badge>
                      </div>
                      {entry.project_allocations && entry.project_allocations.length > 0 && (
                        <div className="space-y-1 pl-4 border-l-2 border-slate-200">
                          {entry.project_allocations.map((alloc, i) => {
                            const project = projects.find(p => p.id === alloc.project_id);
                            return (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">
                                  {project?.name || alloc.project_id} - {alloc.category}
                                </span>
                                <span className="font-medium text-slate-900">{alloc.hours}h</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}