import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Loader2, ExternalLink, Calendar, MessageSquare, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import WelcomeMessage from '@/components/onboarding/WelcomeMessage';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';
import FeedbackModal from '@/components/onboarding/FeedbackModal';

export default function MyOnboarding() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (user?.email) {
        const employees = await base44.entities.Employee.filter({ user_email: user.email });
        setEmployee(employees[0] || null);
      }
    };
    fetchEmployee();
  }, [user]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['onboarding-tasks', employee?.id],
    queryFn: () => base44.entities.OnboardingTask.filter({ employee_id: employee.id }, '-created_date'),
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
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
    },
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved');
  const totalTasks = tasks.length;
  const completedCount = completedTasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const allTasksCompleted = totalTasks > 0 && completedCount === totalTasks;
  const hasFeedback = employee?.onboarding_feedback?.overall_rating > 0;

  const getStatusIcon = (task) => {
    if (task.status === 'completed' || task.status === 'approved') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (task.due_date && new Date(task.due_date) < new Date()) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <Clock className="h-5 w-5 text-slate-400" />;
  };

  const getStatusBadge = (task) => {
    if (task.status === 'completed' || task.status === 'approved') {
      return <Badge className="bg-green-100 text-green-700">Klar</Badge>;
    }
    if (task.due_date && new Date(task.due_date) < new Date()) {
      return <Badge className="bg-red-100 text-red-700">Försenad</Badge>;
    }
    return <Badge variant="outline">Pågående</Badge>;
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Min onboarding</h1>
            <p className="text-slate-600">Följ din introduktionsprocess</p>
          </div>

          {/* Welcome Message */}
          {employee && (
            <WelcomeMessage employee={employee} />
          )}

          {/* Progress Overview */}
          {totalTasks > 0 && (
            <OnboardingProgress tasks={tasks} />
          )}

          {/* Feedback Button */}
          {allTasksCompleted && !hasFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        Du har slutfört alla uppgifter!
                      </h3>
                      <p className="text-sm text-slate-600">
                        Hjälp oss förbättra onboarding-processen genom att dela din feedback
                      </p>
                    </div>
                    <Button onClick={() => setShowFeedbackModal(true)} className="bg-green-600 hover:bg-green-700">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Ge feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {hasFeedback && (
            <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Onboarding slutförd!</h3>
                    <p className="text-sm text-slate-600">Tack för din feedback</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {employee?.onboarding_status === 'not_started' && totalTasks === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Ingen onboarding tilldelad</h2>
              <p className="text-slate-600">Din onboarding-process har inte startats ännu. Kontakta HR för mer information.</p>
            </CardContent>
          </Card>
        )}

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div className="space-y-4 mt-6">
            <h2 className="text-lg font-semibold text-slate-900">Väntande uppgifter</h2>
            {pendingTasks.map((task) => (
              <Card key={task.id} className={`border-0 shadow-sm ${task.is_critical ? 'ring-2 ring-amber-200' : ''}`}>
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
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'd MMM yyyy', { locale: sv })}
                          </span>
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
            ))}
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="space-y-3 mt-6">
            <h2 className="text-lg font-semibold text-slate-900">Slutförda uppgifter</h2>
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
        )}

        {totalTasks === 0 && !isLoading && employee?.onboarding_status !== 'not_started' && (
          <Card className="border-0 shadow-sm mt-6">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Inga onboarding-uppgifter tillgängliga än</p>
            </CardContent>
          </Card>
        )}

        {/* Feedback Modal */}
        {employee && (
          <FeedbackModal
            open={showFeedbackModal}
            onClose={() => {
              setShowFeedbackModal(false);
              queryClient.invalidateQueries({ queryKey: ['employee'] });
            }}
            employee={employee}
          />
        )}
      </div>
    </div>
  );
}