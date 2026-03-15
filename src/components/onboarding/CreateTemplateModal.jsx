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
import { Plus, Trash2, Loader2, Paperclip, X, FileText, Image } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const departments = ["Ledning", "HR", "Sälj", "Marknad", "IT", "Ekonomi", "Produktion", "Kundtjänst", "Övrigt"];

export default function CreateTemplateModal({ open, onClose, template }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: '',
    is_active: true,
    tasks: [],
    attachments: []
  });
  const [uploadingFile, setUploadingFile] = useState(null); // 'template' or task index

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        department: template.department || '',
        is_active: template.is_active !== false,
        tasks: template.tasks || [],
        attachments: template.attachments || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        department: '',
        is_active: true,
        tasks: [],
        attachments: []
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
          admin_notes: '',
          attachments: []
        }
      ]
    }));
  };

  const handleUploadFile = async (file, target) => {
    // target: 'template' or task index number
    setUploadingFile(target);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const attachment = { name: file.name, url: file_url, type: file.type };

    if (target === 'template') {
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), attachment]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tasks: prev.tasks.map((task, i) =>
          i === target ? { ...task, attachments: [...(task.attachments || []), attachment] } : task
        )
      }));
    }
    setUploadingFile(null);
  };

  const handleRemoveAttachment = (target, attachIdx) => {
    if (target === 'template') {
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== attachIdx)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tasks: prev.tasks.map((task, i) =>
          i === target ? { ...task, attachments: task.attachments.filter((_, ai) => ai !== attachIdx) } : task
        )
      }));
    }
  };

  const AttachmentList = ({ attachments, target }) => (
    <div className="space-y-1">
      {(attachments || []).map((att, i) => (
        <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 text-sm">
          {att.type?.includes('pdf') ? <FileText className="h-4 w-4 text-red-500 shrink-0" /> : <Image className="h-4 w-4 text-blue-500 shrink-0" />}
          <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-slate-700 hover:underline">{att.name}</a>
          <button type="button" onClick={() => handleRemoveAttachment(target, i)} className="text-slate-400 hover:text-red-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );

  const FileUploadButton = ({ target, label }) => (
    <label className="cursor-pointer">
      <input
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files[0]) handleUploadFile(e.target.files[0], target); e.target.value = ''; }}
      />
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-3 py-1.5 transition-colors">
        {uploadingFile === target ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        {uploadingFile === target ? 'Laddar upp...' : (label || 'Bifoga PDF/bild')}
      </span>
    </label>
  );

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

          <div className="space-y-2">
            <Label>Bilagor till mallen</Label>
            <AttachmentList attachments={formData.attachments} target="template" />
            <FileUploadButton target="template" label="Bifoga PDF/bild till mall" />
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

                    <div className="space-y-1.5">
                      <AttachmentList attachments={task.attachments} target={index} />
                      <FileUploadButton target={index} label="Bifoga PDF/bild till uppgift" />
                    </div>
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