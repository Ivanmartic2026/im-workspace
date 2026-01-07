import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, Lock } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { sv } from "date-fns/locale";

export default function PayrollExport() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isLocked, setIsLocked] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list()
  });

  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);

  const monthEntries = timeEntries.filter(e => {
    const date = new Date(e.date);
    return date >= monthStart && date <= monthEnd && e.status === 'approved';
  });

  const handleExportPayroll = () => {
    const payrollData = employees.map(emp => {
      const empEntries = monthEntries.filter(e => e.employee_email === emp.user_email);
      const regularHours = empEntries.reduce((sum, e) => sum + ((e.total_hours || 0) - (e.overtime_hours || 0)), 0);
      const overtimeHours = empEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0);
      
      return {
        email: emp.user_email,
        name: emp.user_email,
        department: emp.department,
        regularHours: regularHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        totalHours: (regularHours + overtimeHours).toFixed(2),
        vacationDays: emp.vacation_used_this_year || 0,
        sickDays: emp.sick_days_this_year || 0
      };
    });

    const csv = [
      ['Email', 'Avdelning', 'Reg. timmar', 'Övertid', 'Totalt timmar', 'Semester', 'Sjukdagar'].join(','),
      ...payrollData.map(d => [
        d.email,
        d.department,
        d.regularHours,
        d.overtimeHours,
        d.totalHours,
        d.vacationDays,
        d.sickDays
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lon-underlag-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <FileSpreadsheet className="h-8 w-8" />
            <div>
              <h3 className="font-semibold mb-1">Löneunderlag</h3>
              <p className="text-sm text-white/70">
                Exportera godkänd tid för lönehantering
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Välj löneperiod</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={format(new Date(), 'yyyy-MM')}>
                    {format(new Date(), 'MMMM yyyy', { locale: sv })}
                  </SelectItem>
                  <SelectItem value={format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM')}>
                    {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: sv })}
                  </SelectItem>
                  <SelectItem value={format(new Date(new Date().setMonth(new Date().getMonth() - 2)), 'yyyy-MM')}>
                    {format(new Date(new Date().setMonth(new Date().getMonth() - 2)), 'MMMM yyyy', { locale: sv })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Godkända tider</span>
                <span className="text-lg font-bold text-slate-900">{monthEntries.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Totalt timmar</span>
                <span className="text-lg font-bold text-slate-900">
                  {monthEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0).toFixed(0)}h
                </span>
              </div>
            </div>

            <Button 
              onClick={handleExportPayroll}
              className="w-full h-12"
              disabled={monthEntries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportera löneunderlag (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Lås löneperiod</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            När en period är låst kan inga ändringar göras av anställda. 
            Detta bör göras efter att löneunderlaget exporterats.
          </p>
          <Button 
            variant={isLocked ? "destructive" : "outline"}
            onClick={() => setIsLocked(!isLocked)}
            className="w-full"
          >
            <Lock className="w-4 h-4 mr-2" />
            {isLocked ? 'Lås upp period' : 'Lås period för ändringar'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Tips:</strong> Exportera alltid löneunderlaget innan du låser perioden. 
            Efter att perioden är låst kan du säkert skicka underlaget till lönesystemet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}