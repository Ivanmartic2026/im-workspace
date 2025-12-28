import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2, AlertTriangle, Wrench, Car, Ban, HelpCircle } from "lucide-react";

const incidentTypes = [
  { value: 'skada', label: 'Skada', icon: AlertTriangle, color: 'text-rose-600' },
  { value: 'tekniskt_fel', label: 'Tekniskt fel', icon: Wrench, color: 'text-orange-600' },
  { value: 'trafikincident', label: 'Trafikincident', icon: Car, color: 'text-red-600' },
  { value: 'inbrott_stöld', label: 'Inbrott/Stöld', icon: Ban, color: 'text-purple-600' },
  { value: 'annat', label: 'Annat', icon: HelpCircle, color: 'text-slate-600' }
];

export default function ReportIncidentModal({ open, onClose, onSuccess, vehicles, selectedVehicle, userEmail }) {
  const [formData, setFormData] = useState({
    vehicle_id: selectedVehicle?.id || '',
    registration_number: selectedVehicle?.registration_number || '',
    issue_type: 'tekniskt_fel',
    severity: 'kan_köras',
    title: '',
    description: '',
    incident_date: new Date().toISOString().slice(0, 16),
    location: '',
    mileage: '',
    images: []
  });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.MaintenanceIssue.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['issues']);
      queryClient.invalidateQueries(['vehicles']);
      onSuccess();
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      vehicle_id: selectedVehicle?.id || '',
      registration_number: selectedVehicle?.registration_number || '',
      issue_type: 'tekniskt_fel',
      severity: 'kan_köras',
      title: '',
      description: '',
      incident_date: new Date().toISOString().slice(0, 16),
      location: '',
      mileage: '',
      images: []
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Kunde inte ladda upp bilder');
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const selectedVehicleData = vehicles.find(v => v.id === formData.vehicle_id);
    
    createMutation.mutate({
      ...formData,
      registration_number: selectedVehicleData?.registration_number,
      mileage: formData.mileage ? Number(formData.mileage) : undefined,
      priority: formData.issue_type === 'trafikincident' || formData.issue_type === 'inbrott_stöld' ? 'hög' : 'normal'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rapportera händelse</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Fordon *</Label>
            <Select
              value={formData.vehicle_id}
              onValueChange={(value) => {
                const vehicle = vehicles.find(v => v.id === value);
                setFormData(prev => ({ 
                  ...prev, 
                  vehicle_id: value,
                  registration_number: vehicle?.registration_number || '',
                  mileage: vehicle?.current_mileage || ''
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj fordon" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number} - {vehicle.make} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Incident Type */}
          <div className="space-y-2">
            <Label>Typ av händelse *</Label>
            <div className="grid grid-cols-2 gap-2">
              {incidentTypes.map(type => {
                const Icon = type.icon;
                const isSelected = formData.issue_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, issue_type: type.value }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-slate-900 bg-slate-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-slate-900' : type.color}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incident_date">Datum och tid *</Label>
              <Input
                id="incident_date"
                type="datetime-local"
                value={formData.incident_date}
                onChange={(e) => setFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mileage">Mätarställning (km)</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Plats *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Var inträffade händelsen?"
              required
            />
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="severity">Allvarlighetsgrad *</Label>
            <Select
              value={formData.severity}
              onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kan_köras">Kan köras</SelectItem>
                <SelectItem value="bör_ej_köras">Bör ej köras</SelectItem>
                <SelectItem value="måste_stanna">Måste stanna</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Rubrik *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Kort beskrivning av händelsen"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detaljerad beskrivning *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Beskriv händelsen i detalj..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Bilder</Label>
            <div className="space-y-2">
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    <span className="text-sm text-slate-500">Laddar upp...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Lägg till bilder</span>
                  </>
                )}
              </label>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Bild ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Avbryt
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !formData.vehicle_id || !formData.title || !formData.description}
              className="flex-1"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rapporterar...
                </>
              ) : (
                'Rapportera'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}