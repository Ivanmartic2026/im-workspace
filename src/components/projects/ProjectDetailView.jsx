import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Users, Clock, TrendingUp, CheckCircle2, AlertCircle, 
  Calendar, DollarSign, BarChart3, Plus, User, Navigation
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import TaskList from './TaskList';
import ProjectTimeline from './ProjectTimeline';
import AddTaskModal from './AddTaskModal';
import ActiveClockIns from './ActiveClockIns';
import ProjectDrivingJournal from './ProjectDrivingJournal';
import ProjectExpenses from './ProjectExpenses';

export default function ProjectDetailView({ project, onClose }) {
  const [showAddTask, setShowAddTask] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', project.id],
    queryFn: async () => {
      const allTasks = await base44.entities.ProjectTask.filter({ project_id: project.id });
      return allTasks;
    },
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['project-time', project.id],
    queryFn: async () => {
      const allEntries = await base44.entities.TimeEntry.list();
      return allEntries.filter(entry => 
        entry.project_allocations?.some(alloc => alloc.project_id === project.id)
      );
    },
    initialData: []
  });

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

  // Beräkna projektstatistik
  const calculateStats = () => {
    const totalHours = timeEntries.reduce((sum, entry) => {
      const projectAllocs = entry.project_allocations?.filter(a => a.project_id === project.id) || [];
      return sum + projectAllocs.reduce((s, a) => s + (a.hours || 0), 0);
    }, 0);

    const budgetUsage = project.budget_hours ? (totalHours / project.budget_hours) * 100 : 0;
    
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskCompletion = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    const estimatedCost = totalHours * (project.hourly_rate || 0);

    const uniqueMembers = new Set([
      ...tasks.map(t => t.assigned_to).filter(Boolean),
      ...timeEntries.map(e => e.employee_email).filter(Boolean)
    ]);

    return {
      totalHours: totalHours.toFixed(1),
      budgetUsage: budgetUsage.toFixed(1),
      taskCompletion: taskCompletion.toFixed(0),
      completedTasks,
      totalTasks: tasks.length,
      estimatedCost: estimatedCost.toFixed(0),
      memberCount: uniqueMembers.size,
      members: Array.from(uniqueMembers)
    };
  };

  const stats = calculateStats();
  const isOverBudget = parseFloat(stats.budgetUsage) > 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-slate-900">{project.name}</h2>
            <Badge className={
              project.status === 'pågående' ? 'bg-blue-100 text-blue-700' :
              project.status === 'avslutat' ? 'bg-slate-100 text-slate-700' :
              project.status === 'pausat' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }>
              {project.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-600">{project.project_code}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Stäng
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalHours}h</p>
                <p className="text-xs text-slate-600">Loggade timmar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${isOverBudget ? 'bg-gradient-to-br from-rose-50 to-red-50' : 'bg-gradient-to-br from-emerald-50 to-teal-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${isOverBudget ? 'bg-rose-100' : 'bg-emerald-100'} flex items-center justify-center`}>
                <TrendingUp className={`h-5 w-5 ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.budgetUsage}%</p>
                <p className="text-xs text-slate-600">Budgetanvändning</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.completedTasks}/{stats.totalTasks}</p>
                <p className="text-xs text-slate-600">Uppgifter klara</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.memberCount}</p>
                <p className="text-xs text-slate-600">Projektmedlemmar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Projektframsteg</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Uppgifter slutförda</span>
              <span className="text-sm font-bold text-slate-900">{stats.taskCompletion}%</span>
            </div>
            <Progress value={parseFloat(stats.taskCompletion)} className="h-3" />
          </div>
          
          {project.budget_hours && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Tidsbudget använd</span>
                <span className={`text-sm font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>
                  {stats.totalHours}h / {project.budget_hours}h
                </span>
              </div>
              <Progress 
                value={Math.min(parseFloat(stats.budgetUsage), 100)} 
                className={`h-3 ${isOverBudget ? '[&>div]:bg-rose-500' : ''}`}
              />
            </div>
          )}

          {project.hourly_rate && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Beräknad kostnad</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{stats.estimatedCost} kr</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full bg-white shadow-sm rounded-lg p-1">
          <TabsTrigger value="overview" className="rounded-md flex-1">
            <Clock className="h-4 w-4 mr-2" />
            Översikt
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-md flex-1">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Uppgifter
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-md flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Tidslinje
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-md flex-1">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ActiveClockIns projectId={project.id} />
            <ProjectExpenses project={project} timeEntries={timeEntries} />
          </div>
          <ProjectDrivingJournal projectId={project.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <div className="space-y-3">
            <Button onClick={() => setShowAddTask(true)} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Ny uppgift
            </Button>
            <TaskList tasks={tasks} projectId={project.id} />
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <ProjectTimeline project={project} tasks={tasks} />
        </TabsContent>

        <TabsContent value="members">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Projektmedlemmar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Inga medlemmar än</p>
              ) : (
                stats.members.map(email => {
                  const user = users.find(u => u.email === email);
                  const employee = employees.find(e => e.user_email === email);
                  const memberHours = timeEntries
                    .filter(e => e.employee_email === email)
                    .reduce((sum, entry) => {
                      const projectAllocs = entry.project_allocations?.filter(a => a.project_id === project.id) || [];
                      return sum + projectAllocs.reduce((s, a) => s + (a.hours || 0), 0);
                    }, 0);

                  return (
                    <div key={email} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user?.full_name || email}</p>
                          <p className="text-xs text-slate-500">{employee?.job_title || 'Medlem'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{memberHours.toFixed(1)}h</p>
                        <p className="text-xs text-slate-500">loggat</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        projectId={project.id}
      />
    </div>
  );
}