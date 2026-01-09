import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const departments = ["Ledning", "HR", "Sälj", "Marknad", "IT", "Ekonomi", "Produktion", "Kundtjänst", "Övrigt"];

export default function CreateTemplateModal({ open, onClose, template }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: '',
    is_active: true,
    tasks: []
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        department: template.department || '',
        is_active: template.is_active !== false,
        tasks: template.tasks || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        department: '',
        is_active: true,
        tasks: []
      });
    }
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (template) {
        return base44.entities.OnboardingTemplate.update(template.id, data);
      } else {
        return base44.entities.OnboardingTemplate.create(data);
      }
    },
    onSuccess: () => {
      onClose();
    },
  });

  const handleAddTask = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          title: '',
          description: '',
          days_after_start: 1,
          assigned_to_role: 'employee',
          is_critical: false,
          related_resource_url: '',
          admin_notes: ''
        }
      ]
    }));
  };

  const handleRemoveTask = (index) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const handleTaskChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Redigera mall' : 'Skapa ny mall'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Mallnamn *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="T.ex. Standardkontor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Avdelning</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj avdelning" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Beskriv vad denna mall är för..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active" className="cursor-pointer">Aktiv mall</Label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Uppgifter</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTask}>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till uppgift
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {formData.tasks.map((task, index) => (
                <Card key={index} className="border-slate-200">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Input
                        placeholder="Uppgiftstitel *"
                        value={task.title}
                        onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTask(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Textarea
                      placeholder="Beskrivning"
                      value={task.description}
                      onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                      className="min-h-[60px]"
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Dagar efter start</Label>
                        <Input
                          type="number"
                          min="0"
                          value={task.days_after_start}
                          onChange={(e) => handleTaskChange(index, 'days_after_start', parseInt(e.target.value))}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Ansvarig</Label>
                        <Select
                          value={task.assigned_to_role}
                          onValueChange={(value) => handleTaskChange(index, 'assigned_to_role', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Medarbetare</SelectItem>
                            <SelectItem value="manager">Chef</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={task.is_critical}
                            onCheckedChange={(checked) => handleTaskChange(index, 'is_critical', checked)}
                          />
                          <span className="text-xs">Kritisk</span>
                        </label>
                      </div>
                    </div>

                    <Input
                      placeholder="Resurslänk (valfritt)"
                      value={task.related_resource_url}
                      onChange={(e) => handleTaskChange(index, 'related_resource_url', e.target.value)}
                    />

                    <Textarea
                      placeholder="Admin-noteringar (valfritt)"
                      value={task.admin_notes}
                      onChange={(e) => handleTaskChange(index, 'admin_notes', e.target.value)}
                      className="min-h-[50px]"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || !formData.name}
              className="flex-1"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Spara mall'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}