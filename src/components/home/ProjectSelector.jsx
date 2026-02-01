import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Briefcase, ChevronRight, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectSelector({ onProjectSelect, selectedProjectId }) {
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ name: '', category: 'support_service' });
  const [loading, setLoading] = useState(false);

  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const all = await base44.entities.Project.list('-updated_date');
      return all.filter(p => p.status === 'pågående');
    },
    initialData: []
  });

  const handleCreateProject = async () => {
    if (!newProjectData.name) {
      alert('Fyll i projektnamn');
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      const newProject = await base44.entities.Project.create({
        name: newProjectData.name,
        project_code: newProjectData.name,
        status: 'pågående',
        type: 'externt',
        project_manager_email: user.email
      });
      
      await refetchProjects();
      onProjectSelect(newProject.id);
      localStorage.setItem('lastSelectedProjectId', newProject.id);
      setShowNewProjectForm(false);
      setNewProjectData({ name: '', category: 'support_service' });
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Kunde inte skapa projekt: ' + error.message);
    }
    setLoading(false);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (selectedProject && !showNewProjectForm) {
    return (
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Valt projekt</p>
                <p className="font-semibold text-slate-900">{selectedProject.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onProjectSelect(null)}
              className="text-xs text-slate-600"
            >
              Byt
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm mb-4">
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-900 mb-1">Välj projekt</h3>
          <p className="text-xs text-slate-500">Välj vilket projekt du ska arbeta på</p>
        </div>

        <AnimatePresence mode="wait">
          {showNewProjectForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Projektnamn / Projektkod</Label>
                <Input
                  placeholder="t.ex. BB-Jan, 1001, Projekt A"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11"
                />
              </div>
              
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Typ av arbete</Label>
                <Select
                  value={newProjectData.category}
                  onValueChange={(value) => setNewProjectData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support_service">Service</SelectItem>
                    <SelectItem value="install">Install</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                    <SelectItem value="interntid">Interntid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewProjectForm(false);
                    setNewProjectData({ name: '', category: 'support_service' });
                  }}
                  className="flex-1"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={loading || !newProjectData.name}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Skapar...
                    </>
                  ) : (
                    'Skapa'
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {projects.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-xl">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-3">Inga projekt ännu</p>
                  <Button
                    onClick={() => setShowNewProjectForm(true)}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Skapa projekt
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto pr-1">
                    {projects.map((project) => (
                      <motion.button
                        key={project.id}
                        onClick={() => {
                          onProjectSelect(project.id);
                          localStorage.setItem('lastSelectedProjectId', project.id);
                        }}
                        className="w-full text-left p-4 rounded-xl bg-white border-2 border-slate-200 hover:border-indigo-400 hover:shadow-sm transition-all"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">
                                {project.name}
                              </p>
                              {project.type && (
                                <p className="text-xs text-slate-500 mt-0.5 capitalize">
                                  {project.type === 'externt' ? 'Externt projekt' : project.type}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewProjectForm(true)}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nytt projekt
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}