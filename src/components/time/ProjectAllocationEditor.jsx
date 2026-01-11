import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, X, Save, Clock, Coffee } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const categories = [
  { id: 'support_service', label: 'Support & service' },
  { id: 'install', label: 'Install' },
  { id: 'rental', label: 'Rental' },
  { id: 'interntid', label: 'Interntid' }
];

export default function ProjectAllocationEditor({ timeEntry, onSave, onCancel, projects = [] }) {
  const rawTotalHours = timeEntry.total_hours || 0;
  const lunchDeducted = rawTotalHours >= 8;
  const totalHours = lunchDeducted ? rawTotalHours - 1 : rawTotalHours;
  
  const [allocations, setAllocations] = useState(
    timeEntry.project_allocations?.length > 0
      ? timeEntry.project_allocations
      : timeEntry.project_id
      ? [{
          project_id: timeEntry.project_id,
          hours: totalHours,
          category: timeEntry.category || 'support_service',
          notes: ''
        }]
      : [{
          project_id: '',
          hours: totalHours,
          category: 'support_service',
          notes: ''
        }]
  );

  const [useDropdown, setUseDropdown] = useState(
    allocations.map(a => projects.some(p => p.id === a.project_id))
  );

  const allocatedHours = allocations.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
  const remainingHours = totalHours - allocatedHours;
  const progressPercentage = totalHours > 0 ? (allocatedHours / totalHours) * 100 : 0;

  const handleAddAllocation = () => {
    setAllocations([
      ...allocations,
      {
        project_id: '',
        hours: remainingHours > 0 ? Number(remainingHours.toFixed(2)) : 0,
        category: 'support_service',
        notes: ''
      }
    ]);
  };

  const handleRemoveAllocation = (index) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const handleUpdateAllocation = (index, field, value) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'hours' && index < allocations.length - 1) {
      const newAllocatedHours = updated.reduce((sum, a, i) => 
        i <= index ? sum + (Number(a.hours) || 0) : sum, 0
      );
      const newRemaining = totalHours - newAllocatedHours;
      
      updated[index + 1] = { 
        ...updated[index + 1], 
        hours: Math.max(0, Number(newRemaining.toFixed(2))) 
      };
    }
    
    setAllocations(updated);
  };

  const handleSave = async () => {
    if (allocatedHours > totalHours) {
      alert(`Du har fördelat ${allocatedHours.toFixed(2)}h men bara ${totalHours.toFixed(2)}h är tillgängliga`);
      return;
    }

    const validAllocations = allocations.filter(a => {
      const projectId = a.project_id?.trim();
      return projectId && projectId.length > 0 && a.hours > 0;
    });
    
    if (validAllocations.length === 0) {
      alert('Lägg till minst ett projekt med timmar');
      return;
    }

    if (Math.abs(allocatedHours - totalHours) > 0.01) {
      const confirmMsg = `Du har fördelat ${allocatedHours.toFixed(2)}h av ${totalHours.toFixed(2)}h. Vill du fortsätta?`;
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    try {
      // Call onSave first to save the time entry
      await onSave(validAllocations);
      
      // Check project budget after saving
      try {
        await base44.functions.invoke('checkProjectBudget', { time_entry_id: timeEntry.id });
      } catch (budgetError) {
        console.error('Error checking project budget:', budgetError);
      }
    } catch (error) {
      console.error('Error saving project allocation:', error);
      alert('Kunde inte spara: ' + error.message);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Fördela arbetstid</h3>
            <p className="text-sm text-slate-500 mt-1">
              {format(new Date(timeEntry.date), 'EEEE d MMMM', { locale: sv })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{totalHours.toFixed(2)}h</p>
            <p className="text-xs text-slate-500">att fördela</p>
          </div>
        </div>

        {lunchDeducted && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
            <Coffee className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-emerald-800">
              <strong>Lunch avdragen:</strong> 1 timme automatiskt borttagen från {rawTotalHours.toFixed(2)}h totalt arbetad tid
            </div>
          </div>
        )}

        <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Tidsfördelning</span>
            <span className="text-sm font-bold text-slate-900">{allocatedHours.toFixed(2)}h / {totalHours.toFixed(2)}h</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-3" 
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{progressPercentage.toFixed(0)}% fördelat</span>
            {remainingHours > 0 && (
              <span className="text-amber-600 font-medium">
                {remainingHours.toFixed(2)}h kvar
              </span>
            )}
            {remainingHours === 0 && (
              <span className="text-emerald-600 font-medium">✓ Fullständigt fördelat</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {allocations.map((allocation, index) => (
            <div key={index} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Projekt {index + 1}</span>
                {allocations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAllocation(index)}
                    className="h-7 text-rose-600 hover:text-rose-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Projekt</Label>
                    <button
                      type="button"
                      onClick={() => {
                        const newUseDropdown = [...useDropdown];
                        newUseDropdown[index] = !newUseDropdown[index];
                        setUseDropdown(newUseDropdown);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {useDropdown[index] ? 'Skriv själv' : 'Välj från lista'}
                    </button>
                  </div>
                  {useDropdown[index] && projects.length > 0 ? (
                    <Select
                      value={allocation.project_id}
                      onValueChange={(value) => handleUpdateAllocation(index, 'project_id', value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Välj projekt" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} ({project.project_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={allocation.project_id}
                      onChange={(e) => handleUpdateAllocation(index, 'project_id', e.target.value)}
                      placeholder="T.ex. im101"
                      className="h-10"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Timmar</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max={totalHours}
                    value={allocation.hours}
                    onChange={(e) => handleUpdateAllocation(index, 'hours', parseFloat(e.target.value) || 0)}
                    className="h-10 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Kategori</Label>
                <Select
                  value={allocation.category}
                  onValueChange={(value) => handleUpdateAllocation(index, 'category', value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Anteckningar (valfritt)</Label>
                <Input
                  value={allocation.notes || ''}
                  onChange={(e) => handleUpdateAllocation(index, 'notes', e.target.value)}
                  placeholder="Vad gjorde du..."
                  className="h-10"
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAddAllocation}
          className="w-full h-11 rounded-xl border-dashed border-2"
          disabled={remainingHours <= 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Lägg till projekt
        </Button>

        {allocatedHours > totalHours && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
            <p className="text-sm text-rose-800">
              ⚠️ Du har fördelat {Math.abs(totalHours - allocatedHours).toFixed(2)}h för mycket
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={allocatedHours > totalHours}
            className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800"
          >
            <Save className="w-4 h-4 mr-2" />
            Spara fördelning
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}