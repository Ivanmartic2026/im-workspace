import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";

export default function ProjectExpenses({ project, timeEntries }) {
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['project-journal-expenses', project.id],
    queryFn: async () => {
      const allEntries = await base44.entities.DrivingJournalEntry.list();
      return allEntries.filter(entry => entry.project_code === project.id);
    },
    initialData: []
  });

  // Beräkna kostnader
  const calculateExpenses = () => {
    const timeHoursCost = timeEntries.reduce((sum, entry) => {
      const projectAllocs = entry.project_allocations?.filter(a => a.project_id === project.id) || [];
      const hours = projectAllocs.reduce((s, a) => s + (a.hours || 0), 0);
      return sum + (hours * (project.hourly_rate || 0));
    }, 0);

    // Grov uppskattning på fordonskostnader (ca 2 kr/km)
    const vehicleCost = journalEntries.reduce((sum, entry) => {
      return sum + ((entry.distance_km || 0) * 2);
    }, 0);

    return {
      laborCost: timeHoursCost,
      vehicleCost,
      totalCost: timeHoursCost + vehicleCost
    };
  };

  const expenses = calculateExpenses();
  const totalHours = timeEntries.reduce((sum, entry) => {
    const projectAllocs = entry.project_allocations?.filter(a => a.project_id === project.id) || [];
    return sum + projectAllocs.reduce((s, a) => s + (a.hours || 0), 0);
  }, 0);

  const isOverBudget = project.budget_hours && totalHours > project.budget_hours;

  return (
    <Card className={`border-0 shadow-sm ${isOverBudget ? 'bg-gradient-to-br from-rose-50 to-red-50' : ''}`}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-slate-500" />
          Projektbudget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-600 mb-1">Arbetsmoment</p>
            <p className="text-lg font-bold text-slate-900">{expenses.laborCost.toFixed(0)} kr</p>
            <p className="text-xs text-slate-500">{totalHours.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Fordonskostnader</p>
            <p className="text-lg font-bold text-slate-900">{expenses.vehicleCost.toFixed(0)} kr</p>
            <p className="text-xs text-slate-500">{journalEntries.reduce((sum, e) => sum + (e.distance_km || 0), 0).toFixed(0)}km</p>
          </div>
        </div>

        {/* Total Cost */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Total kostnad</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{expenses.totalCost.toFixed(0)} kr</span>
          </div>
        </div>

        {/* Budget Status */}
        {project.hourly_rate && (
          <div className={`p-3 rounded-lg border ${isOverBudget ? 'bg-rose-100 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-start gap-2">
              {isOverBudget && <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />}
              <div className="text-sm">
                <p className={isOverBudget ? 'text-rose-900 font-semibold' : 'text-slate-700'}>
                  {isOverBudget ? 'Budget överskriden' : 'Inom budget'}
                </p>
                <p className={`text-xs mt-1 ${isOverBudget ? 'text-rose-800' : 'text-slate-600'}`}>
                  {totalHours.toFixed(1)}h av {project.budget_hours || '∞'}h tilldelad
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}