import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckCircle2, Circle, Clock, Users, Key, Eye, EyeOff, 
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, AlertCircle, Loader2, List
} from "lucide-react";
import CreateTemplateModal from '@/components/onboarding/CreateTemplateModal';
import AssignTemplateModal from '@/components/onboarding/AssignTemplateModal';

const statusConfig = {
  not_started: { label: 'Ej påbörjad', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'Pågår', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Klar', color: 'bg-emerald-100 text-emerald-700' },
};

function CredentialsModal({ employee, open, onClose }) {
  const queryClient = useQueryClient();
  const [showPasswords, setShowPasswords] = useState({});
  const [credentials, setCredentials] = useState(employee?.credentials || []);

  React.useEffect(() => {
    setCredentials(employee?.credentials || []);
  }, [employee]);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Employee.update(employee.id, { credentials }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-onboarding'] });
      onClose();
    }
  });

  const addCredential = () => {
    setCredentials(prev => [...prev, { system_name: '', username: '', password: '', url: '', notes: '' }]);
  };

  const removeCredential = (i) => setCredentials(prev => prev.filter((_, idx) => idx !== i));

  const updateCredential = (i, field, value) => {
    setCredentials(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Koder & inloggningar — {employee?.display_name || employee?.user_email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {credentials.map((cred, i) => (
            <Card key={i} className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="Systemnamn (t.ex. Fortnox)"
                    value={cred.system_name}
                    onChange={(e) => updateCredential(i, 'system_name', e.target.value)}
                    className="font-medium"
                  />
                  <Button variant="ghost" size="icon" className="text-red-500 ml-2" onClick={() => removeCredential(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Användarnamn</Label>
                    <Input
                      placeholder="användarnamn"
                      value={cred.username}
                      onChange={(e) => updateCredential(i, 'username', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Lösenord / PIN</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords[i] ? 'text' : 'password'}
                        placeholder="lösenord"
                        value={cred.password}
                        onChange={(e) => updateCredential(i, 'password', e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [i]: !prev[i] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords[i] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <Input
                  placeholder="URL (valfritt)"
                  value={cred.url}
                  onChange={(e) => updateCredential(i, 'url', e.target.value)}
                />
                <Input
                  placeholder="Noteringar (valfritt)"
                  value={cred.notes}
                  onChange={(e) => updateCredential(i, 'notes', e.target.value)}
                />
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full" onClick={addCredential}>
            <Plus className="h-4 w-4 mr-2" />
            Lägg till system
          </Button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Avbryt</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Spara
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeOnboardingRow({ employee, templates }) {
  const [expanded, setExpanded] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showAssignTemplate, setShowAssignTemplate] = useState(false);
  const queryClient = useQueryClient();

  const template = templates.find(t => t.id === employee.assigned_onboarding_template_id);
  const tasks = template?.tasks || [];

  const completedTaskIds = employee.onboarding_completed_tasks || [];
  const completedCount = tasks.filter(t => completedTaskIds.includes(t.title)).length;

  const toggleTask = useMutation({
    mutationFn: (taskTitle) => {
      const current = employee.onboarding_completed_tasks || [];
      const updated = current.includes(taskTitle)
        ? current.filter(t => t !== taskTitle)
        : [...current, taskTitle];
      return base44.entities.Employee.update(employee.id, { onboarding_completed_tasks: updated });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees-onboarding'] })
  });

  const updateStatus = useMutation({
    mutationFn: (status) => base44.entities.Employee.update(employee.id, { onboarding_status: status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees-onboarding'] })
  });

  const status = employee.onboarding_status || 'not_started';
  const cfg = statusConfig[status] || statusConfig.not_started;

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 truncate">{employee.display_name || employee.user_email}</div>
          <div className="text-xs text-slate-500">{employee.department} · {employee.job_title || 'Ingen titel'}</div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
          {template ? (
            <span className="truncate max-w-[140px]">{template.name}</span>
          ) : (
            <span className="text-slate-400 italic">Ingen mall</span>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {completedCount}/{tasks.length}
          </div>
        )}

        <Badge className={`${cfg.color} border-0 text-xs whitespace-nowrap`}>{cfg.label}</Badge>

        <Button variant="outline" size="sm" onClick={() => setShowAssignTemplate(true)} className="gap-1.5 whitespace-nowrap">
          <Plus className="h-3.5 w-3.5" />
          Tilldela mall
        </Button>

        <Button variant="outline" size="sm" onClick={() => setShowCredentials(true)} className="gap-1.5 whitespace-nowrap">
          <Key className="h-3.5 w-3.5" />
          Koder ({(employee.credentials || []).length})
        </Button>
      </div>

      {expanded && (
        <div className="ml-8 pl-4 border-l-2 border-slate-100 space-y-2 pb-2">
          {/* Status-knappar */}
          <div className="flex gap-2 pt-2 flex-wrap">
            {Object.entries(statusConfig).map(([key, val]) => (
              <Button
                key={key}
                size="sm"
                variant={status === key ? 'default' : 'outline'}
                onClick={() => updateStatus.mutate(key)}
                className="text-xs"
              >
                {val.label}
              </Button>
            ))}
          </div>

          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">Ingen onboardingmall tilldelad — gå till Employees för att tilldela.</p>
          ) : (
            <div className="space-y-1">
              {tasks.map((task, i) => {
                const done = completedTaskIds.includes(task.title);
                return (
                  <div
                    key={i}
                    onClick={() => toggleTask.mutate(task.title)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    {done
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      : <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />
                    }
                    <span className={`text-sm ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {task.title}
                    </span>
                    {task.is_critical && (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 ml-auto flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CredentialsModal
        employee={employee}
        open={showCredentials}
        onClose={() => setShowCredentials(false)}
      />
    </>
  );
}

export default function OnboardingAdmin() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-onboarding'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: () => base44.entities.OnboardingTemplate.list(),
  });

  const filtered = employees.filter(emp => {
    const matchSearch = !search ||
      (emp.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (emp.user_email || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || emp.onboarding_status === filter || (!emp.onboarding_status && filter === 'not_started');
    return matchSearch && matchFilter;
  });

  const counts = {
    all: employees.length,
    not_started: employees.filter(e => !e.onboarding_status || e.onboarding_status === 'not_started').length,
    in_progress: employees.filter(e => e.onboarding_status === 'in_progress').length,
    completed: employees.filter(e => e.onboarding_status === 'completed').length,
  };

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.OnboardingTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] }),
  });

  return (
    <div className="space-y-4">

      {/* Mallar-sektion */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowTemplateList(!showTemplateList)}
              className="flex items-center gap-2 font-medium text-slate-800 hover:text-slate-600"
            >
              <List className="h-4 w-4" />
              Onboarding-mallar ({templates.length} st)
              {showTemplateList ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <Button size="sm" onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Ny mall
            </Button>
          </div>

          {showTemplateList && (
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Inga mallar skapade ännu.</p>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-800 truncate">{t.name}</div>
                      {t.description && <div className="text-xs text-slate-500 truncate">{t.description}</div>}
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">{t.tasks?.length || 0} uppgifter</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTemplate(t); setShowTemplateModal(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => window.confirm(`Ta bort "${t.name}"?`) && deleteTemplateMutation.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'all', label: 'Totalt', icon: Users, color: 'text-slate-600 bg-slate-100' },
          { key: 'not_started', label: 'Ej påbörjad', icon: Circle, color: 'text-slate-500 bg-slate-100' },
          { key: 'in_progress', label: 'Pågår', icon: Clock, color: 'text-blue-600 bg-blue-100' },
          { key: 'completed', label: 'Klara', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100' },
        ].map(({ key, label, icon: Icon, color }) => (
          <Card
            key={key}
            className={`border-0 shadow-sm cursor-pointer transition-all ${filter === key ? 'ring-2 ring-slate-900' : 'hover:shadow-md'}`}
            onClick={() => setFilter(key)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{counts[key]}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Sök medarbetare..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-white"
      />

      <CreateTemplateModal
        open={showTemplateModal}
        onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] }); }}
        template={editingTemplate}
      />

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Inga medarbetare hittades</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(emp => (
            <EmployeeOnboardingRow key={emp.id} employee={emp} templates={templates} />
          ))}
        </div>
      )}
    </div>
  );
}