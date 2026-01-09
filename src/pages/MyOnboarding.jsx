import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, FileText, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isPast } from "date-fns";
import { sv } from "date-fns/locale";

export default function MyOnboarding() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: employee } = useQuery({
    queryKey: ['myEmployee', user?.email],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({ user_email: user.email });
      return employees[0] || null;
    },
    enabled: !!user,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['myOnboardingTasks', employee?.id],
    queryFn: async () => {
      return base44.entities.OnboardingTask.filter({ employee_id: employee.id }, '-created_date');
    },
    enabled: !!employee?.id,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      return base44.entities.OnboardingTask.update(taskId, {
        status: 'completed',
        completion_date: new Date().toISOString(),
        completed_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOnboardingTasks'] });
    },
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');
  const progressPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  const getStatusIcon = (task) => {
    if (task.status === 'completed' || task.status === 'approved') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (task.due_date && isPast(new Date(task.due_date))) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <Clock className="h-5 w-5 text-slate-400" />;
  };

  const getStatusBadge = (task) => {
    if (task.status === 'completed' || task.status === 'approved') {
      return <Badge className="bg-green-100 text-green-700">Klar</Badge>;
    }
    if (task.due_date && isPast(new Date(task.due_date))) {
      return <Badge className="bg-red-100 text-red-700">Försenad</Badge>;
    }
    return <Badge variant="outline">Pågående</Badge>;
  };

  if (!user || !employee) return null;

  if (employee.onboarding_status === 'not_started') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24 flex items-center justify-center">
        <Card className="max-w-md mx-4 border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Välkommen!</h2>
            <p className="text-slate-500">Din onboarding har inte startats än. Kontakta HR för mer information.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Min Onboarding</h1>

          {/* Progress Card */}
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Framsteg</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {completedTasks.length} av {tasks.length} uppgifter slutförda
                </span>
                <span className="font-semibold text-slate-900">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Väntande uppgifter</h2>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {pendingTasks.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className={`border-0 shadow-sm ${task.is_critical ? 'ring-2 ring-amber-200' : ''}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(task)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="font-semibold text-slate-900">{task.title}</h3>
                                {getStatusBadge(task)}
                              </div>
                              {task.description && (
                                <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                {task.due_date && (
                                  <span>Förfaller: {format(new Date(task.due_date), 'd MMM yyyy', { locale: sv })}</span>
                                )}
                                {task.is_critical && (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    Kritisk
                                  </Badge>
                                )}
                              </div>
                              {task.related_resource_url && (
                                <a
                                  href={task.related_resource_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-3"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Visa resurs
                                </a>
                              )}
                              {task.assigned_to_role === 'employee' && (
                                <Button
                                  onClick={() => completeTaskMutation.mutate(task.id)}
                                  disabled={completeTaskMutation.isPending}
                                  size="sm"
                                  className="mt-3"
                                >
                                  Markera som klar
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Slutförda uppgifter</h2>
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <Card key={task.id} className="border-0 shadow-sm bg-green-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{task.title}</p>
                          {task.completion_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              Slutförd {format(new Date(task.completion_date), 'd MMM yyyy', { locale: sv })}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && !isLoading && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Inga onboarding-uppgifter tillgängliga än</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}