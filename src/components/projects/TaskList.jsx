import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, User, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import EditTaskModal from './EditTaskModal';

export default function TaskList({ tasks, projectId }) {
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['project-tasks', projectId]);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ProjectTask.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['project-tasks', projectId]);
    }
  });

  const handleDelete = (id) => {
    if (confirm('Är du säker på att du vill ta bort denna uppgift?')) {
      deleteMutation.mutate(id);
    }
  };

  const statusConfig = {
    todo: { label: 'Att göra', color: 'bg-slate-100 text-slate-700', icon: Circle },
    in_progress: { label: 'Pågående', color: 'bg-blue-100 text-blue-700', icon: Clock },
    review: { label: 'Granskning', color: 'bg-amber-100 text-amber-700', icon: Clock },
    completed: { label: 'Klar', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
  };

  const priorityConfig = {
    low: { label: 'Låg', color: 'bg-slate-100 text-slate-600' },
    medium: { label: 'Medel', color: 'bg-blue-100 text-blue-700' },
    high: { label: 'Hög', color: 'bg-amber-100 text-amber-700' },
    critical: { label: 'Kritisk', color: 'bg-rose-100 text-rose-700' }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = { todo: 0, in_progress: 1, review: 2, completed: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  if (tasks.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">Inga uppgifter än. Skapa din första uppgift!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sortedTasks.map(task => {
        const StatusIcon = statusConfig[task.status]?.icon || Circle;
        
        return (
          <Card key={task.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => updateStatusMutation.mutate({
                    id: task.id,
                    status: task.status === 'completed' ? 'todo' : 'completed'
                  })}
                  className="mt-1"
                >
                  <StatusIcon className={`h-5 w-5 ${
                    task.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'
                  }`} />
                </button>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingTask(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600"
                        onClick={() => handleDelete(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusConfig[task.status]?.color}>
                      {statusConfig[task.status]?.label}
                    </Badge>
                    <Badge className={priorityConfig[task.priority]?.color}>
                      {priorityConfig[task.priority]?.label}
                    </Badge>
                    {task.assigned_to && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.assigned_to.split('@')[0]}
                      </Badge>
                    )}
                    {task.due_date && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(task.due_date), 'd MMM', { locale: sv })}
                      </Badge>
                    )}
                  </div>

                  {task.completion_percentage !== undefined && task.completion_percentage > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">Framsteg</span>
                        <span className="text-xs font-medium text-slate-900">{task.completion_percentage}%</span>
                      </div>
                      <Progress value={task.completion_percentage} className="h-2" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <EditTaskModal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        projectId={projectId}
      />
    </div>
  );
}