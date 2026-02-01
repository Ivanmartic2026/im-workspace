import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const AVAILABLE_FEATURES = [
  { id: 'TimeTracking', label: 'Tidrapportering', icon: '⏱️' },
  { id: 'Vehicles', label: 'Fordon', icon: '🚗' },
  { id: 'GPS', label: 'GPS-spårning', icon: '📍' },
  { id: 'DrivingJournal', label: 'Körjournal', icon: '📝' },
  { id: 'Manuals', label: 'Manualer', icon: '📚' },
  { id: 'Chat', label: 'Chat', icon: '💬' },
  { id: 'Reports', label: 'Rapporter', icon: '📊' },
];

export default function EditFeaturesModal({ employee, onClose }) {
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (employee?.assigned_features) {
      setSelectedFeatures(employee.assigned_features);
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Employee.update(employee.id, {
        assigned_features: selectedFeatures
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    }
  });

  const toggleFeature = (featureId) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hantera funktioner</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{employee.full_name || employee.user_email}</p>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {AVAILABLE_FEATURES.map(feature => (
            <div key={feature.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <Checkbox
                id={feature.id}
                checked={selectedFeatures.includes(feature.id)}
                onCheckedChange={() => toggleFeature(feature.id)}
              />
              <Label htmlFor={feature.id} className="flex items-center gap-2 cursor-pointer flex-1">
                <span className="text-lg">{feature.icon}</span>
                <span className="font-medium">{feature.label}</span>
              </Label>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-slate-500">
            {selectedFeatures.length} av {AVAILABLE_FEATURES.length} valda
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Spara'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}