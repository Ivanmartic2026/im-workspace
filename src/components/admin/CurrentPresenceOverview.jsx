import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2, PlayCircle, PauseCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function CurrentPresenceOverview() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: timeEntries = [], isLoading: isLoadingTimeEntries } = useQuery({
    queryKey: ['timeEntriesToday'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const allEntries = await base44.entities.TimeEntry.list();
      return allEntries.filter(entry => entry.date === today);
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

    if (todayEntry) {
      clockInTime = todayEntry.clock_in_time ? format(new Date(todayEntry.clock_in_time), 'HH:mm') : null;
      clockOutTime = todayEntry.clock_out_time ? format(new Date(todayEntry.clock_out_time), 'HH:mm') : null;
      totalHours = todayEntry.total_hours || 0;

      if (clockInTime && !clockOutTime) {
        status = 'clocked_in';
      } else if (clockInTime && clockOutTime) {
        status = 'clocked_out';
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
    };
  }).sort((a, b) => {
    if (a.status === b.status) return a.full_name?.localeCompare(b.full_name || '') || 0;
    if (a.status === 'clocked_in') return -1;
    if (b.status === 'clocked_in') return 1;
    if (a.status === 'clocked_out') return -1;
    return 1;
  });

  const filteredEmployees = employeeStatus.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    return emp.full_name?.toLowerCase().includes(searchLower) ||
           emp.email?.toLowerCase().includes(searchLower) ||
           emp.department?.toLowerCase().includes(searchLower);
  });

  const clockedInCount = employeeStatus.filter(e => e.status === 'clocked_in').length;
  const clockedOutCount = employeeStatus.filter(e => e.status === 'clocked_out').length;
  const notLoggedInCount = employeeStatus.filter(e => e.status === 'not_logged').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <p className="text-xs text-slate-600">Utstämplade idag</p>
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
            <Card key={employee.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
                    <p className="text-sm text-slate-500">{employee.department}</p>
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
    </div>
  );
}