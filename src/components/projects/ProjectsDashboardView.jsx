import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Eye, Edit, Trash2, Clock, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function ProjectsDashboardView({ 
  projects, 
  timeEntries, 
  journalEntries, 
  employees,
  onView, 
  onEdit, 
  onDelete 
}) {
  const getProjectStats = (project) => {
    const projectHours = timeEntries
      .filter(entry => {
        if (entry.project_id === project.id) return true;
        if (entry.project_allocations?.length > 0) {
          return entry.project_allocations.some(alloc => alloc.project_id === project.id);
        }
        return false;
      })
      .reduce((sum, entry) => {
        if (entry.project_allocations?.length > 0) {
          const allocation = entry.project_allocations.find(alloc => alloc.project_id === project.id);
          return sum + (allocation?.hours || 0);
        }
        return sum + (entry.total_hours || 0);
      }, 0);

    const projectKm = journalEntries
      .filter(entry => entry.project_code === project.project_code)
      .reduce((sum, entry) => sum + (entry.distance_km || 0), 0);

    const budgetProgress = project.budget_hours ? (projectHours / project.budget_hours) * 100 : 0;
    const isOverBudget = budgetProgress > 100;

    const latestEntry = timeEntries
      .filter(entry => {
        if (entry.project_id === project.id) return true;
        if (entry.project_allocations?.length > 0) {
          return entry.project_allocations.some(alloc => alloc.project_id === project.id);
        }
        return false;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    const latestEmployee = latestEntry 
      ? employees.find(emp => emp.user_email === latestEntry.employee_email)
      : null;

    return {
      hours: projectHours,
      km: projectKm,
      budgetProgress,
      isOverBudget,
      latestEntry,
      latestEmployee
    };
  };

  if (projects.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">Inga projekt matchar dina filter</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header Row */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
        <div className="col-span-3">PROJEKT</div>
        <div className="col-span-2">STATUS</div>
        <div className="col-span-2 text-center">TIMMAR / BUDGET</div>
        <div className="col-span-2 text-center">PROGRESS</div>
        <div className="col-span-2">SENAST AKTIV</div>
        <div className="col-span-1 text-right">ÅTGÄRDER</div>
      </div>

      {/* Project Rows */}
      {projects.map((project, index) => {
        const stats = getProjectStats(project);
        
        return (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card className="border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
              <CardContent className="p-4">
                {/* Desktop View */}
                <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                  {/* Project Name */}
                  <div className="col-span-3">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 truncate">{project.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {project.project_code}
                        </span>
                        {project.customer && (
                          <span className="text-xs text-slate-500 truncate">{project.customer}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <Badge className={`
                      ${project.status === 'pågående' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'avslutat' ? 'bg-slate-200 text-slate-700' :
                        project.status === 'pausat' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'}
                    `}>
                      {project.status}
                    </Badge>
                  </div>

                  {/* Hours / Budget */}
                  <div className="col-span-2 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-bold text-slate-900">{stats.hours.toFixed(1)}h</span>
                      </div>
                      {project.budget_hours && (
                        <p className="text-xs text-slate-500">av {project.budget_hours}h</p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="col-span-2">
                    {project.budget_hours ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Budget</span>
                          <span className={`font-bold ${stats.isOverBudget ? 'text-red-600' : 'text-blue-600'}`}>
                            {stats.budgetProgress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(stats.budgetProgress, 100)} 
                          className={`h-2 ${stats.isOverBudget ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500'}`}
                        />
                        {stats.isOverBudget && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Överskriden</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Ingen budget</span>
                    )}
                  </div>

                  {/* Last Active */}
                  <div className="col-span-2">
                    {stats.latestEntry ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-indigo-600" />
                          <span className="text-xs font-medium text-slate-900">
                            {format(parseISO(stats.latestEntry.date), 'd MMM', { locale: sv })}
                          </span>
                        </div>
                        {stats.latestEmployee && (
                          <p className="text-xs text-slate-500 truncate">
                            {stats.latestEmployee.display_name || stats.latestEmployee.user_email.split('@')[0]}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Ingen aktivitet</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(project)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(project)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(project.id)}
                      className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{project.name}</p>
                      <p className="text-xs text-slate-500 truncate">{project.project_code}</p>
                    </div>
                    <Badge className={`
                      ml-2 ${project.status === 'pågående' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'avslutat' ? 'bg-slate-200 text-slate-700' :
                        project.status === 'pausat' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'}
                    `}>
                      {project.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Timmar</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-bold text-slate-900">{stats.hours.toFixed(1)}h</span>
                      </div>
                    </div>

                    {project.budget_hours && (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500">Budget</p>
                        <div className="flex items-center gap-2">
                          <TrendingUp className={`h-4 w-4 ${stats.isOverBudget ? 'text-red-600' : 'text-blue-600'}`} />
                          <span className={`font-bold ${stats.isOverBudget ? 'text-red-600' : 'text-slate-900'}`}>
                            {stats.budgetProgress.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {project.budget_hours && (
                    <Progress 
                      value={Math.min(stats.budgetProgress, 100)} 
                      className={`h-2 ${stats.isOverBudget ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500'}`}
                    />
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    {stats.latestEntry && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-indigo-600" />
                        <span className="text-xs text-slate-600">
                          {format(parseISO(stats.latestEntry.date), 'd MMM', { locale: sv })}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(project)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(project)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(project.id)}
                        className="h-8 w-8 p-0 text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}