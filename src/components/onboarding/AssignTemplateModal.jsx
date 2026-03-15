import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function AssignTemplateModal({ open, onClose, employee }) {
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['onboardingTemplates'],
    queryFn: () => base44.entities.OnboardingTemplate.filter({ is_active: true }),
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      // Assign first template as primary
      const primaryTemplateId = selectedTemplateIds[0];
      await base44.entities.Employee.update(employee.id, {
        assigned_onboarding_template_id: primaryTemplateId,
        onboarding_status: 'in_progress',
        onboarding_start_date: employee.start_date || new Date().toISOString().split('T')[0]
      });

      // Generate tasks for all selected templates
      for (const templateId of selectedTemplateIds) {
        await base44.functions.invoke('generateOnboardingTasks', {
          employee_id: employee.id,
          template_id: templateId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedTemplateIds([]);
        onClose();
      }, 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    assignMutation.mutate();
  };

  const toggleTemplate = (templateId) => {
    setSelectedTemplateIds(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tilldela onboarding-mall</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900">Mall tilldelad!</p>
            <p className="text-sm text-slate-500 mt-1">Onboarding-uppgifter har skapats</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label>Välj mallar *</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {templates.length === 0 ? (
                  <p className="text-sm text-slate-400">Inga mallar tillgängliga</p>
                ) : (
                  templates.map(template => (
                    <div key={template.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded">
                      <Checkbox
                        id={`template-${template.id}`}
                        checked={selectedTemplateIds.includes(template.id)}
                        onCheckedChange={() => toggleTemplate(template.id)}
                        className="mt-1"
                      />
                      <label htmlFor={`template-${template.id}`} className="flex-1 cursor-pointer text-sm">
                        <div className="font-medium text-slate-900">{template.name}</div>
                        {template.department && (
                          <div className="text-xs text-slate-500">({template.department})</div>
                        )}
                        {template.description && (
                          <div className="text-xs text-slate-500 mt-1">{template.description}</div>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedTemplateIds.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                <p className="text-emerald-900 font-medium">
                  {selectedTemplateIds.length} mall{selectedTemplateIds.length > 1 ? 'er' : ''} vald{selectedTemplateIds.length > 1 ? 'a' : ''}
                </p>
                <p className="text-emerald-700 mt-1">
                  {templates.filter(t => selectedTemplateIds.includes(t.id)).reduce((sum, t) => sum + (t.tasks?.length || 0), 0)} uppgifter totalt
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={assignMutation.isPending || selectedTemplateIds.length === 0}
                className="flex-1"
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tilldelar...
                  </>
                ) : (
                  'Tilldela mallar'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}