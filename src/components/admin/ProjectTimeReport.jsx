import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, TrendingUp, Briefcase, User } from "lucide-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const categoryLabels = {
  support_service: 'Support & service',
  install: 'Install',
  rental: 'Rental',
  interntid: 'Interntid'
};

export default function ProjectTimeReport() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 1000),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Beräkna period
  const today = new Date();
  let startDate, endDate;
  if (selectedPeriod === 'week') {
    startDate = startOfWeek(today, { weekStartsOn: 1 });
    endDate = endOfWeek(today, { weekStartsOn: 1 });
  } else {
    startDate = startOfMonth(today);
    endDate = endOfMonth(today);
  }

  // Filtrera tidrapporter
  const filteredEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const matchesPeriod = entryDate >= startDate && entryDate <= endDate;
    const matchesEmployee = selectedEmployee === 'all' || entry.employee_email === selectedEmployee;
    const matchesStatus = entry.status === 'completed' || entry.status === 'approved';
    
    if (!matchesPeriod || !matchesEmployee || !matchesStatus) return false;
    
    // Om projekt-filter är satt, kolla både project_id och project_allocations
    if (selectedProject !== 'all') {
      const hasMatchingProject = entry.project_id === selectedProject || 
        entry.project_allocations?.some(a => a.project_id === selectedProject);
      if (!hasMatchingProject) return false;
    }
    
    return true;
  });

  // Samla unika projekt
  const allProjects = new Set();
  filteredEntries.forEach(entry => {
    if (entry.project_id) allProjects.add(entry.project_id);
    if (entry.project_allocations) {
      entry.project_allocations.forEach(a => allProjects.add(a.project_id));
    }
  });

  // Aggregera data per projekt och kategori
  const projectData = {};
  
  filteredEntries.forEach(entry => {
    if (entry.project_allocations?.length > 0) {
      // Använd project_allocations
      entry.project_allocations.forEach(allocation => {
        if (selectedProject === 'all' || allocation.project_id === selectedProject) {
          const key = allocation.project_id;
          if (!projectData[key]) {
            projectData[key] = {
              project_id: allocation.project_id,
              total_hours: 0,
              categories: {}
            };
          }
          
          const category = allocation.category || 'interntid';
          if (!projectData[key].categories[category]) {
            projectData[key].categories[category] = 0;
          }
          
          projectData[key].total_hours += allocation.hours || 0;
          projectData[key].categories[category] += allocation.hours || 0;
        }
      });
    } else if (entry.project_id) {
      // Använd gamla project_id
      if (selectedProject === 'all' || entry.project_id === selectedProject) {
        const key = entry.project_id;
        if (!projectData[key]) {
          projectData[key] = {
            project_id: entry.project_id,
            total_hours: 0,
            categories: {}
          };
        }
        
        const category = entry.category || 'interntid';
        if (!projectData[key].categories[category]) {
          projectData[key].categories[category] = 0;
        }
        
        projectData[key].total_hours += entry.total_hours || 0;
        projectData[key].categories[category] += entry.total_hours || 0;
      }
    }
  });

  const projectStats = Object.values(projectData).sort((a, b) => b.total_hours - a.total_hours);
  const totalHours = projectStats.reduce((sum, p) => sum + p.total_hours, 0);

  return (
    <div className="space-y-6">
      {/* Period & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedPeriod === 'week'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Denna vecka
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedPeriod === 'month'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Denna månad
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Välj anställd" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla anställda</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.user_email}>
                  {e.user_email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Välj projekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla projekt</SelectItem>
              {Array.from(allProjects).sort().map(projectId => (
                <SelectItem key={projectId} value={projectId}>
                  {projectId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Totalt</p>
                <p className="text-xl font-bold text-slate-900">{totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Projekt</p>
                <p className="text-xl font-bold text-slate-900">{projectStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Poster</p>
                <p className="text-xl font-bold text-slate-900">{filteredEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Breakdown */}
      <div className="space-y-3">
        {projectStats.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Ingen data för vald period</p>
            </CardContent>
          </Card>
        ) : (
          projectStats.map((project, idx) => (
            <motion.div
              key={project.project_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {project.project_id}
                    </CardTitle>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {project.total_hours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-slate-500">
                        {((project.total_hours / totalHours) * 100).toFixed(0)}% av total
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(project.categories).map(([category, hours]) => (
                      <div key={category} className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">
                          {categoryLabels[category] || category}
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {hours.toFixed(1)}h
                        </p>
                        <p className="text-xs text-slate-400">
                          {((hours / project.total_hours) * 100).toFixed(0)}% av projekt
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}