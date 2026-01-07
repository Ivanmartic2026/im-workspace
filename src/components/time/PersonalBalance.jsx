import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, TrendingUp, Briefcase, Heart, Coffee } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function PersonalBalance({ employee, timeEntries }) {
  if (!employee) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-slate-500">Laddar saldon...</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate this month's hours
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const thisMonthEntries = timeEntries.filter(e => {
    const date = new Date(e.date);
    return date >= monthStart && date <= monthEnd && e.status === 'completed';
  });
  const thisMonthHours = thisMonthEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

  // Calculate this year's hours
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());
  const thisYearEntries = timeEntries.filter(e => {
    const date = new Date(e.date);
    return date >= yearStart && date <= yearEnd && e.status === 'completed';
  });
  const thisYearHours = thisYearEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

  const balanceCards = [
    {
      title: 'Denna månad',
      value: `${thisMonthHours.toFixed(1)}h`,
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'I år totalt',
      value: `${thisYearHours.toFixed(1)}h`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      title: 'Flexsaldo',
      value: `${employee.flex_balance >= 0 ? '+' : ''}${employee.flex_balance?.toFixed(1) || 0}h`,
      icon: Clock,
      color: employee.flex_balance >= 0 ? 'text-emerald-600' : 'text-rose-600',
      bg: employee.flex_balance >= 0 ? 'bg-emerald-50' : 'bg-rose-50'
    },
    {
      title: 'Komptid',
      value: `${employee.comp_time_balance?.toFixed(1) || 0}h`,
      icon: Coffee,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      title: 'Semester kvar',
      value: `${employee.vacation_balance || 0} dagar`,
      icon: Briefcase,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      title: 'Sjukdagar i år',
      value: `${employee.sick_days_this_year || 0} dagar`,
      icon: Heart,
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    }
  ];

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-white/70 mb-2">Aktuellt saldo</p>
            <p className="text-4xl font-bold mb-1">
              {employee.flex_balance >= 0 ? '+' : ''}{employee.flex_balance?.toFixed(1) || 0}h
            </p>
            <p className="text-xs text-white/60">Flextid</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {balanceCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{card.title}</p>
                  <p className="text-xl font-bold text-slate-900">{card.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Vacation Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Semesteröversikt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Intjänat i år</span>
            <span className="font-semibold text-slate-900">{employee.vacation_earned_this_year || 0} dagar</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Använt i år</span>
            <span className="font-semibold text-slate-900">{employee.vacation_used_this_year || 0} dagar</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium text-slate-900">Kvar att ta ut</span>
            <span className="text-lg font-bold text-slate-900">{employee.vacation_balance || 0} dagar</span>
          </div>
        </CardContent>
      </Card>

      {/* Overtime */}
      {employee.overtime_hours_this_month > 0 && (
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-800 font-medium mb-1">Övertid denna månad</p>
                <p className="text-2xl font-bold text-amber-900">{employee.overtime_hours_this_month.toFixed(1)}h</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}