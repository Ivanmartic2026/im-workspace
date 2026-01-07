import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Save, Clock } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const categories = [
  { id: 'support_service', label: 'Support & service' },
  { id: 'install', label: 'Install' },
  { id: 'rental', label: 'Rental' },
  { id: 'interntid', label: 'Interntid' }
];

export default function ProjectAllocationEditor({ timeEntry, onSave, onCancel }) {
  const totalHours = timeEntry.total_hours || 0;
  
  const [allocations, setAllocations] = useState(
    timeEntry.project_allocations?.length > 0
      ? timeEntry.project_allocations
      : timeEntry.project_id
      ? [{
          project_id: timeEntry.project_id,
          hours: totalHours,
          category: timeEntry.category || 'projekt',
          notes: ''
        }]
      : [{
          project_id: '',
          hours: 0,
          category: 'projekt',
          notes: ''
        }]
  );

  const allocatedHours = allocations.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
  const remainingHours = totalHours - allocatedHours;

  const handleAddAllocation = () => {
    setAllocations([
      ...allocations,
      {
        project_id: '',
        hours: remainingHours > 0 ? remainingHours : 0,
        category: 'projekt',
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
    
    // Om vi uppdaterar timmar och det finns ett nästa projekt, uppdatera det med återstående timmar
    if (field === 'hours' && index < allocations.length - 1) {
      const newAllocatedHours = updated.reduce((sum, a, i) => 
        i <= index ? sum + (Number(a.hours) || 0) : sum, 0
      );
      const newRemaining = totalHours - newAllocatedHours;
      
      // Uppdatera nästa projekt med återstående timmar
      updated[index + 1] = { 
        ...updated[index + 1], 
        hours: Math.max(0, newRemaining) 
      };
    }
    
    setAllocations(updated);
  };

  const handleSave = () => {
    if (allocatedHours > totalHours) {
      alert(`Du har fördelat ${allocatedHours.toFixed(2)}h men bara ${totalHours.toFixed(2)}h är tillgängliga`);
      return;
    }

    const validAllocations = allocations.filter(a => a.project_id.trim() && a.hours > 0);
    
    if (validAllocations.length === 0) {
      alert('Lägg till minst ett projekt med timmar');
      return;
    }

    onSave(validAllocations);
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
            <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(2)}h</p>
            <p className="text-xs text-slate-500">totalt</p>
          </div>
        </div>

        <div className="space-y-3">
          {allocations.map((allocation, index) => (
            <div key={index} className="p-4 bg-slate-50 rounded-xl space-y-3">
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
                  <Label className="text-xs">RM ID</Label>
                  <Input
                    value={allocation.project_id}
                    onChange={(e) => handleUpdateAllocation(index, 'project_id', e.target.value)}
                    placeholder="T.ex. RM-1234"
                    className="h-10"
                  />
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
                    className="h-10"
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
          className="w-full h-11 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Lägg till projekt
        </Button>

        {allocatedHours !== totalHours && (
          <div className={`p-3 rounded-lg ${remainingHours < 0 ? 'bg-rose-50 border border-rose-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-sm ${remainingHours < 0 ? 'text-rose-800' : 'text-amber-800'}`}>
              {remainingHours < 0 ? (
                <>Du har fördelat {Math.abs(remainingHours).toFixed(2)}h för mycket</>
              ) : (
                <><Clock className="inline h-3 w-3 mr-1" />{remainingHours.toFixed(2)}h kvar att fördela</>
              )}
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
            className="flex-1 h-12 rounded-2xl"
          >
            <Save className="w-4 h-4 mr-2" />
            Spara fördelning
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}