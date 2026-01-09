import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, CheckCircle, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CreateTemplateModal from '@/components/onboarding/CreateTemplateModal';

export default function OnboardingTemplates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['onboardingTemplates'],
    queryFn: () => base44.entities.OnboardingTemplate.list('-created_date'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.OnboardingTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingTemplates'] });
    },
  });

  const filteredTemplates = templates.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDelete = (template) => {
    if (window.confirm(`Ta bort mallen "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Onboarding-mallar</h1>
              <p className="text-sm text-slate-500 mt-1">{templates.length} mallar</p>
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setShowCreateModal(true);
              }}
              className="rounded-full h-11 px-5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Skapa mall
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök mallar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-0 bg-white shadow-sm"
            />
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <List className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Inga mallar hittades</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTemplates.map((template, idx) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              {template.name}
                              {!template.is_active && (
                                <Badge variant="outline" className="text-xs">Inaktiv</Badge>
                              )}
                            </CardTitle>
                            {template.description && (
                              <p className="text-sm text-slate-500 mt-2">{template.description}</p>
                            )}
                            {template.department && (
                              <Badge variant="secondary" className="mt-2">
                                {template.department}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(template)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(template)}
                              disabled={deleteTemplateMutation.isPending}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>{template.tasks?.length || 0} uppgifter</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <CreateTemplateModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
          queryClient.invalidateQueries({ queryKey: ['onboardingTemplates'] });
        }}
        template={editingTemplate}
      />
    </div>
  );
}