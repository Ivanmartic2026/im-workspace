import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Loader2, PlayCircle, PauseCircle, XCircle, MapPin, AlertTriangle, ArrowUpDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInHours, addDays, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import EmployeePresenceDetailModal from './EmployeePresenceDetailModal';

export default function CurrentPresenceOverview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sortBy, setSortBy] = useState('status');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: timeEntries = [], isLoading: isLoadingTimeEntries } = useQuery({
    queryKey: ['timeEntriesForDate', selectedDate],
    queryFn: async () => {
      const allEntries = await base44.entities.TimeEntry.list();
      return allEntries.filter(entry => entry.date === selectedDate);
    },
    refetchInterval: 60000,
  });

  const isLoading = isLoadingEmployees || isLoadingUsers || isLoadingTimeEntries;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Laddar närvarostatus...</p>
        </CardContent>
      </Card>
    );
  }

  const employeeStatus = users.map(user => {
    const employeeData = employees.find(emp => emp.user_email === user.email);
    const todayEntry = timeEntries.find(entry => entry.employee_email === user.email);

    let status = 'not_logged';
    let clockInTime = null;
    let clockOutTime = null;
    let totalHours = 0;
    let clockInLocation = null;
    let clockOutLocation = null;
    let hasWarning = false;
    let warningMessage = '';

    if (todayEntry) {
      clockInTime = todayEntry.clock_in_time ? format(new Date(todayEntry.clock_in_time), 'HH:mm') : null;
      clockOutTime = todayEntry.clock_out_time ? format(new Date(todayEntry.clock_out_time), 'HH:mm') : null;
      totalHours = todayEntry.total_hours || 0;
      clockInLocation = todayEntry.clock_in_location;
      clockOutLocation = todayEntry.clock_out_location;

      if (clockInTime && !clockOutTime) {
        status = 'clocked_in';
        // Check if clocked in for too long
        const hoursSinceClockIn = differenceInHours(new Date(), new Date(todayEntry.clock_in_time));
        if (hoursSinceClockIn >= 10) {
          hasWarning = true;
          warningMessage = `Instämplad i ${hoursSinceClockIn}h - glömt utstämpling?`;
        }
      } else if (clockInTime && clockOutTime) {
        status = 'clocked_out';
      }

      // Check if work outside normal hours
      if (todayEntry.clock_in_time) {
        const clockInHour = new Date(todayEntry.clock_in_time).getHours();
        if (clockInHour < 6 || clockInHour > 22) {
          hasWarning = true;
          warningMessage = warningMessage || 'Arbetat utanför normal arbetstid';
        }
      }
    }

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      department: employeeData?.department || 'Ej angivet',
      status,
      clockInTime,
      clockOutTime,
      totalHours,
      clockInLocation,
      clockOutLocation,
      hasWarning,
      warningMessage,
      timeEntry: todayEntry,
      employeeData
    };
  });

  // Get unique departments
  const departments = ['all', ...new Set(employeeStatus.map(e => e.department).filter(Boolean))];

  // Filter employees
  let filteredEmployees = employeeStatus.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = emp.full_name?.toLowerCase().includes(searchLower) ||
                         emp.email?.toLowerCase().includes(searchLower) ||
                         emp.department?.toLowerCase().includes(searchLower);
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Sort employees
  filteredEmployees = filteredEmployees.sort((a, b) => {
    if (sortBy === 'status') {
      if (a.status === b.status) return a.full_name?.localeCompare(b.full_name || '') || 0;
      if (a.status === 'clocked_in') return -1;
      if (b.status === 'clocked_in') return 1;
      if (a.status === 'clocked_out') return -1;
      return 1;
    } else if (sortBy === 'name') {
      return a.full_name?.localeCompare(b.full_name || '') || 0;
    } else if (sortBy === 'hours') {
      return b.totalHours - a.totalHours;
    } else if (sortBy === 'department') {
      return a.department?.localeCompare(b.department || '') || 0;
    }
    return 0;
  });

  const clockedInCount = employeeStatus.filter(e => e.status === 'clocked_in').length;
  const clockedOutCount = employeeStatus.filter(e => e.status === 'clocked_out').length;
  const notLoggedInCount = employeeStatus.filter(e => e.status === 'not_logged').length;
  const warningsCount = employeeStatus.filter(e => e.hasWarning).length;

  const forgottenClockOuts = employeeStatus.filter(e => 
    e.status === 'clocked_in' && 
    e.timeEntry?.clock_in_time &&
    differenceInHours(new Date(), new Date(e.timeEntry.clock_in_time)) >= 10
  );

  const handleEmployeeClick = (emp) => {
    if (emp.timeEntry) {
      setSelectedEmployee(emp);
      setDetailModalOpen(true);
    }
  };

  const goToPreviousDay = () => {
    const prevDay = subDays(new Date(selectedDate), 1);
    setSelectedDate(format(prevDay, 'yyyy-MM-dd'));
  };

  const goToNextDay = () => {
    const nextDay = addDays(new Date(selectedDate), 1);
    setSelectedDate(format(nextDay, 'yyyy-MM-dd'));
  };

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(selectedDate), 'EEEE d MMMM yyyy', { locale: sv });

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousDay}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-slate-600" />
                <h3 className="font-semibold text-slate-900 capitalize">{displayDate}</h3>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-center"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              className="h-9 w-9"
              disabled={isToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {!isToday && (
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Hoppa till idag
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <PlayCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{clockedInCount}</p>
                <p className="text-xs text-slate-600">Instämplade</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <PauseCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{clockedOutCount}</p>
                <p className="text-xs text-slate-600">Utstämplade</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{notLoggedInCount}</p>
                <p className="text-xs text-slate-600">Ej registrerat</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{warningsCount}</p>
                <p className="text-xs text-slate-600">Varningar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forgotten Clock-outs Warning */}
      {forgottenClockOuts.length > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50 border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Glömda utstämplingar</h3>
                <div className="space-y-1">
                  {forgottenClockOuts.map(emp => (
                    <p key={emp.id} className="text-sm text-amber-800">
                      <span className="font-medium">{emp.full_name}</span> - Instämplad i{' '}
                      {differenceInHours(new Date(), new Date(emp.timeEntry.clock_in_time))}h
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Sök på namn, email eller avdelning..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger>
            <SelectValue placeholder="Alla avdelningar" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept === 'all' ? 'Alla avdelningar' : dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Sortera: Status</SelectItem>
            <SelectItem value="name">Sortera: Namn</SelectItem>
            <SelectItem value="hours">Sortera: Timmar</SelectItem>
            <SelectItem value="department">Sortera: Avdelning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee List */}
      <div className="space-y-2">
        {filteredEmployees.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Inga anställda hittades</p>
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map(employee => (
            <Card 
              key={employee.id} 
              className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                employee.hasWarning ? 'border-l-4 border-l-amber-500' : ''
              }`}
              onClick={() => handleEmployeeClick(employee)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
                      {employee.hasWarning && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{employee.department}</p>
                    {employee.clockInLocation && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {employee.clockInLocation.address || `${employee.clockInLocation.latitude?.toFixed(4)}, ${employee.clockInLocation.longitude?.toFixed(4)}`}
                      </p>
                    )}
                    {employee.hasWarning && employee.warningMessage && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {employee.warningMessage}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {employee.status === 'clocked_in' && (
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                          <PlayCircle className="h-4 w-4" /> Instämplad
                        </span>
                        <p className="text-xs text-slate-500 mt-1">In: {employee.clockInTime}</p>
                      </div>
                    )}
                    {employee.status === 'clocked_out' && (
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
                          <PauseCircle className="h-4 w-4" /> Utstämplad
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          {employee.clockInTime} - {employee.clockOutTime} ({employee.totalHours.toFixed(1)}h)
                        </p>
                      </div>
                    )}
                    {employee.status === 'not_logged' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-600">
                        <XCircle className="h-4 w-4" /> Ej registrerat
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <EmployeePresenceDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        timeEntry={selectedEmployee?.timeEntry}
      />
    </div>
  );
}