import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function AssignTemplateModal({ open, onClose, employee }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['onboardingTemplates'],
    queryFn: () => base44.entities.OnboardingTemplate.filter({ is_active: true }),
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      // Update employee with template
      await base44.entities.Employee.update(employee.id, {
        assigned_onboarding_template_id: selectedTemplateId,
        onboarding_status: 'in_progress',
        onboarding_start_date: employee.start_date || new Date().toISOString().split('T')[0]
      });

      // Generate tasks
      await base44.functions.invoke('generateOnboardingTasks', {
        employee_id: employee.id,
        template_id: selectedTemplateId
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedTemplateId('');
        onClose();
      }, 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    assignMutation.mutate();
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
            <div className="space-y-2">
              <Label htmlFor="template">Välj mall *</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj en mall" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} {template.department ? `(${template.department})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {templates.find(t => t.id === selectedTemplateId) && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-slate-600">
                  {templates.find(t => t.id === selectedTemplateId).description}
                </p>
                <p className="text-slate-500 mt-2">
                  {templates.find(t => t.id === selectedTemplateId).tasks?.length || 0} uppgifter kommer att skapas
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={assignMutation.isPending || !selectedTemplateId}
                className="flex-1"
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tilldelar...
                  </>
                ) : (
                  'Tilldela mall'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}