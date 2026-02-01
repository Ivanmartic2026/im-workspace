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
  const [newProjectData, setNewProjectData] = useState({ name: '', project_code: '' });
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
    if (!newProjectData.name || !newProjectData.project_code) {
      alert('Fyll i både projektnamn och projektkod');
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      const newProject = await base44.entities.Project.create({
        name: newProjectData.name,
        project_code: newProjectData.project_code,
        status: 'pågående',
        project_manager_email: user.email
      });
      
      await refetchProjects();
      onProjectSelect(newProject.id);
      localStorage.setItem('lastSelectedProjectId', newProject.id);
      setShowNewProjectForm(false);
      setNewProjectData({ name: '', project_code: '' });
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Kunde inte skapa projekt: ' + error.message);
    }
    setLoading(false);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <Card className="border-0 shadow-sm mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Aktuella projekt
          </Label>
          {!showNewProjectForm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNewProjectForm(true)}
              className="h-8 text-xs text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-3 h-3 mr-1" />
              Nytt projekt
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {showNewProjectForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <Input
                placeholder="Projektnamn"
                value={newProjectData.name}
                onChange={(e) => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                className="h-11"
              />
              <Input
                placeholder="Projektkod (t.ex. PRJ001)"
                value={newProjectData.project_code}
                onChange={(e) => setNewProjectData(prev => ({ ...prev, project_code: e.target.value }))}
                className="h-11"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewProjectForm(false);
                    setNewProjectData({ name: '', project_code: '' });
                  }}
                  className="flex-1 h-11"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={loading || !newProjectData.name || !newProjectData.project_code}
                  className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Skapar...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa
                    </>
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
            >
              {projects.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-xl">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-3">Inga projekt än</p>
                  <Button
                    onClick={() => setShowNewProjectForm(true)}
                    size="sm"
                    className="h-9 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Skapa ditt första projekt
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {projects.map((project) => (
                    <motion.button
                      key={project.id}
                      onClick={() => {
                        onProjectSelect(project.id);
                        localStorage.setItem('lastSelectedProjectId', project.id);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedProjectId === project.id
                          ? 'bg-indigo-50 border-2 border-indigo-500'
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${
                            selectedProjectId === project.id ? 'text-indigo-900' : 'text-slate-900'
                          }`}>
                            {project.name}
                          </p>
                          <p className={`text-xs mt-0.5 ${
                            selectedProjectId === project.id ? 'text-indigo-600' : 'text-slate-500'
                          }`}>
                            {project.project_code}
                          </p>
                        </div>
                        {selectedProjectId === project.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {selectedProject && !showNewProjectForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200"
          >
            <p className="text-xs text-emerald-800 font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Redo att stämpla in på {selectedProject.name}
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}