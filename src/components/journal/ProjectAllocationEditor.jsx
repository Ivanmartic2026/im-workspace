import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectAllocationEditor({ 
  allocations = [], 
  onChange, 
  projects = [], 
  totalDistance 
}) {
  const [mode, setMode] = useState('percentage'); // 'percentage' or 'distance'

  const addAllocation = () => {
    const newAllocation = {
      project_id: '',
      project_name: '',
      percentage: mode === 'percentage' ? 0 : null,
      distance_km: mode === 'distance' ? 0 : null
    };
    onChange([...allocations, newAllocation]);
  };

  const removeAllocation = (index) => {
    onChange(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index, field, value) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'project_id') {
      const project = projects.find(p => p.id === value);
      updated[index].project_name = project?.name || '';
    }
    
    onChange(updated);
  };

  const totalPercentage = allocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0);
  const totalAllocatedKm = allocations.reduce((sum, a) => sum + (parseFloat(a.distance_km) || 0), 0);
  const isValid = mode === 'percentage' 
    ? Math.abs(totalPercentage - 100) < 0.01 
    : Math.abs(totalAllocatedKm - totalDistance) < 0.01;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Projektfördelning</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Procent</SelectItem>
            <SelectItem value="distance">Kilometer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {allocations.map((allocation, index) => (
          <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg">
            <div className="flex-1 space-y-2">
              <Select
                value={allocation.project_id}
                onValueChange={(value) => updateAllocation(index, 'project_id', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Välj projekt" />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter(p => p.status === 'pågående').map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.project_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="number"
                step="0.1"
                value={mode === 'percentage' ? allocation.percentage : allocation.distance_km}
                onChange={(e) => updateAllocation(
                  index, 
                  mode === 'percentage' ? 'percentage' : 'distance_km', 
                  parseFloat(e.target.value) || 0
                )}
                placeholder={mode === 'percentage' ? 'Procent (%)' : 'Kilometer'}
                className="h-9"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeAllocation(index)}
              className="mt-0.5"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addAllocation}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Lägg till projekt
      </Button>

      {allocations.length > 0 && (
        <div className={`flex items-center gap-2 p-2 rounded ${isValid ? 'bg-green-50' : 'bg-amber-50'}`}>
          {!isValid && <AlertCircle className="h-4 w-4 text-amber-600" />}
          <span className="text-sm">
            {mode === 'percentage' ? (
              <>Totalt: <strong>{totalPercentage.toFixed(1)}%</strong> {!isValid && `(måste vara 100%)`}</>
            ) : (
              <>Totalt: <strong>{totalAllocatedKm.toFixed(1)} km</strong> {!isValid && `(måste vara ${totalDistance} km)`}</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}