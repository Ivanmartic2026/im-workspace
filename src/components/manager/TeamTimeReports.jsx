import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, TrendingUp } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { sv } from "date-fns/locale";

export default function TeamTimeReports({ timeEntries, employees }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);

  const monthEntries = timeEntries.filter(e => {
    const date = new Date(e.date);
    return date >= monthStart && date <= monthEnd && e.status === 'completed';
  });

  const employeeStats = employees.map(employee => {
    const empEntries = monthEntries.filter(e => e.employee_email === employee.user_email);
    const totalHours = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
    const expectedHours = (employee.normal_work_hours_per_day || 8) * 22; // ~22 workdays/month
    const overtime = empEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0);

    return {
      employee,
      totalHours,
      expectedHours,
      overtime,
      entries: empEntries.length
    };
  }).sort((a, b) => b.totalHours - a.totalHours);

  const teamTotalHours = employeeStats.reduce((sum, s) => sum + s.totalHours, 0);
  const teamTotalOvertime = employeeStats.reduce((sum, s) => sum + s.overtime, 0);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Välj månad</h3>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={format(new Date(), 'yyyy-MM')}>Denna månad</SelectItem>
                <SelectItem value={format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM')}>
                  Förra månaden
                </SelectItem>
                <SelectItem value={format(new Date(new Date().setMonth(new Date().getMonth() - 2)), 'yyyy-MM')}>
                  {format(new Date(new Date().setMonth(new Date().getMonth() - 2)), 'MMMM', { locale: sv })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Totalt timmar</p>
              <p className="text-2xl font-bold text-slate-900">{teamTotalHours.toFixed(0)}h</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Medel/person</p>
              <p className="text-2xl font-bold text-slate-900">
                {(teamTotalHours / employees.length).toFixed(0)}h
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Övertid</p>
              <p className="text-2xl font-bold text-amber-600">{teamTotalOvertime.toFixed(0)}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {employeeStats.map((stat, index) => (
          <Card key={stat.employee.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{stat.employee.user_email}</p>
                    <p className="text-xs text-slate-500">{stat.employee.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">{stat.totalHours.toFixed(0)}h</p>
                  <p className="text-xs text-slate-500">{stat.entries} dagar</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded">
                  <p className="text-xs text-slate-500">Förväntat</p>
                  <p className="text-sm font-semibold text-slate-700">{stat.expectedHours}h</p>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <p className="text-xs text-slate-500">Differens</p>
                  <p className={`text-sm font-semibold ${
                    stat.totalHours >= stat.expectedHours ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {stat.totalHours >= stat.expectedHours ? '+' : ''}{(stat.totalHours - stat.expectedHours).toFixed(0)}h
                  </p>
                </div>
                <div className="p-2 bg-amber-50 rounded">
                  <p className="text-xs text-amber-700">Övertid</p>
                  <p className="text-sm font-semibold text-amber-900">{stat.overtime.toFixed(0)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}