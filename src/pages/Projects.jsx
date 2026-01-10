import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, FolderOpen, AlertTriangle, DollarSign, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function Projects() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    project_code: '',
    description: '',
    customer: '',
    type: 'externt',
    status: 'planerat',
    start_date: '',
    end_date: '',
    budget_hours: '',
    hourly_rate: '',
    project_manager_email: '',
    is_billable: true
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: []
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowModal(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowModal(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      project_code: '',
      description: '',
      customer: '',
      type: 'externt',
      status: 'planerat',
      start_date: '',
      end_date: '',
      budget_hours: '',
      hourly_rate: '',
      project_manager_email: '',
      is_billable: true
    });
    setEditingProject(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      budget_hours: formData.budget_hours ? Number(formData.budget_hours) : null,
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name || '',
      project_code: project.project_code || '',
      description: project.description || '',
      customer: project.customer || '',
      type: project.type || 'externt',
      status: project.status || 'planerat',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget_hours: project.budget_hours || '',
      hourly_rate: project.hourly_rate || '',
      project_manager_email: project.project_manager_email || '',
      is_billable: project.is_billable !== false
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Är du säker på att du vill ta bort detta projekt?')) {
      deleteMutation.mutate(id);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Åtkomst nekad</h2>
            <p className="text-slate-600">Endast administratörer har tillgång till projekthantering.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Projekthantering</h1>
              <p className="text-slate-600 mt-1">Skapa och hantera projekt</p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nytt projekt
            </Button>
          </div>
        </motion.div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="space-y-3 animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-16 bg-slate-100 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga projekt</h3>
              <p className="text-slate-600 mb-4">Skapa ditt första projekt för att komma igång.</p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Skapa projekt
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {project.project_code}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            project.status === 'pågående' ? 'bg-blue-100 text-blue-700' :
                            project.status === 'avslutat' ? 'bg-slate-100 text-slate-700' :
                            project.status === 'pausat' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(project)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(project.id)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
                    )}
                    {project.customer && (
                      <p className="text-sm text-slate-500">Kund: {project.customer}</p>
                    )}
                    <div className="pt-3 border-t space-y-2">
                      {project.budget_hours && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">{project.budget_hours}h budget</span>
                        </div>
                      )}
                      {project.hourly_rate && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">{project.hourly_rate} kr/h</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Redigera projekt' : 'Nytt projekt'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Projektnamn *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Projektkod *</Label>
                <Input
                  value={formData.project_code}
                  onChange={(e) => setFormData({...formData, project_code: e.target.value})}
                  placeholder="T.ex. PRJ001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beskrivning</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Kund</Label>
              <Input
                value={formData.customer}
                onChange={(e) => setFormData({...formData, customer: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internt">Internt</SelectItem>
                    <SelectItem value="externt">Externt</SelectItem>
                    <SelectItem value="fakturerbart">Fakturerbart</SelectItem>
                    <SelectItem value="ej_fakturerbart">Ej fakturerbart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planerat">Planerat</SelectItem>
                    <SelectItem value="pågående">Pågående</SelectItem>
                    <SelectItem value="avslutat">Avslutat</SelectItem>
                    <SelectItem value="pausat">Pausat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Slutdatum</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budgeterade timmar</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.budget_hours}
                  onChange={(e) => setFormData({...formData, budget_hours: e.target.value})}
                  placeholder="T.ex. 100"
                />
              </div>

              <div className="space-y-2">
                <Label>Timpris (kr)</Label>
                <Input
                  type="number"
                  step="1"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                  placeholder="T.ex. 850"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Projektledare</Label>
              <Select 
                value={formData.project_manager_email} 
                onValueChange={(value) => setFormData({...formData, project_manager_email: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj projektledare" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_billable"
                checked={formData.is_billable}
                onChange={(e) => setFormData({...formData, is_billable: e.target.checked})}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="is_billable" className="cursor-pointer">
                Fakturerbart projekt
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-slate-900 hover:bg-slate-800"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingProject ? 'Uppdatera' : 'Skapa projekt'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}