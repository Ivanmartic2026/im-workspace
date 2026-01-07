import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, BarChart3, Users, Clock, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { sv } from "date-fns/locale";

export default function SystemReports() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list()
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: () => base44.entities.LeaveRequest.list()
  });

  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);

  const monthEntries = timeEntries.filter(e => {
    const date = new Date(e.date);
    return date >= monthStart && date <= monthEnd && e.status === 'completed';
  });

  const totalHours = monthEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
  const totalOvertime = monthEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0);
  const anomalies = monthEntries.filter(e => e.anomaly_flag).length;

  const stats = [
    { label: 'Total arbetstid', value: `${totalHours.toFixed(0)}h`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aktiva medarbetare', value: employees.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Övertid', value: `${totalOvertime.toFixed(0)}h`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Avvikelser', value: anomalies, icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-50' }
  ];

  const handleExportCSV = () => {
    const csv = [
      ['Datum', 'Anställd', 'Kategori', 'In-tid', 'Ut-tid', 'Timmar', 'Övertid', 'Status'].join(','),
      ...monthEntries.map(e => [
        e.date,
        e.employee_email,
        e.category,
        format(new Date(e.clock_in_time), 'HH:mm'),
        e.clock_out_time ? format(new Date(e.clock_out_time), 'HH:mm') : '',
        e.total_hours?.toFixed(2) || '',
        e.overtime_hours?.toFixed(2) || '',
        e.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tidrapport-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Välj period</h3>
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Exportera rapporter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExportCSV} className="w-full" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportera som CSV
          </Button>
          <p className="text-xs text-slate-500 text-center">
            Exporterar alla tidrapporter för vald period
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Topplista - mest arbetade timmar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {employees
              .map(emp => ({
                employee: emp,
                hours: monthEntries
                  .filter(e => e.employee_email === emp.user_email)
                  .reduce((sum, e) => sum + (e.total_hours || 0), 0)
              }))
              .sort((a, b) => b.hours - a.hours)
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.employee.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400">#{index + 1}</span>
                    <span className="text-sm font-medium text-slate-900">{item.employee.user_email}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{item.hours.toFixed(0)}h</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}