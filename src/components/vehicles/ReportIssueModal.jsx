import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { base44 } from "@/api/base44Client";
import { Loader2, Camera, X } from "lucide-react";

const issueTypes = [
  { value: 'fel', label: 'Tekniskt fel' },
  { value: 'skada', label: 'Skada' },
  { value: 'varning', label: 'Varningslampa' },
  { value: 'punktering', label: 'Punktering' },
  { value: 'ruta', label: 'Rutskada' },
  { value: 'stöld', label: 'Stöld/inbrott' },
  { value: 'böter', label: 'Böter' },
  { value: 'annat', label: 'Annat' }
];

export default function ReportIssueModal({ open, onClose, onSuccess, vehicles, selectedVehicle, userEmail }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: selectedVehicle?.id || '',
    issue_type: 'fel',
    severity: 'kan_köras',
    title: '',
    description: '',
    location: '',
    mileage: selectedVehicle?.current_mileage || '',
    images: []
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, images: [...prev.images, file_url] }));
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      
      await base44.entities.MaintenanceIssue.create({
        ...formData,
        registration_number: vehicle?.registration_number,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        status: 'ny',
        priority: formData.severity === 'måste_stanna' ? 'akut' : formData.severity === 'bör_ej_köras' ? 'hög' : 'normal',
        history: [{
          timestamp: new Date().toISOString(),
          user: userEmail,
          action: 'Skapade ärende',
          comment: formData.description
        }]
      });

      onSuccess();
      onClose();
      setFormData({
        vehicle_id: '',
        issue_type: 'fel',
        severity: 'kan_köras',
        title: '',
        description: '',
        location: '',
        mileage: '',
        images: []
      });
    } catch (error) {
      console.error('Error creating issue:', error);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">🛠 Rapportera fel eller skada</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Fordon *</Label>
            <Select
              value={formData.vehicle_id}
              onValueChange={(value) => {
                const vehicle = vehicles.find(v => v.id === value);
                setFormData(prev => ({ 
                  ...prev, 
                  vehicle_id: value,
                  mileage: vehicle?.current_mileage || ''
                }));
              }}
              required
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Välj fordon" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(vehicle => {
                  const hasGPS = vehicle.gps_device_id && vehicle.gps_device_id !== '';
                  const displayName = hasGPS 
                    ? `${vehicle.gps_device_id} - ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
                    : `${vehicle.registration_number} - ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
                  
                  return (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Typ av problem *</Label>
            <Select
              value={formData.issue_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, issue_type: value }))}
              required
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Allvarlighetsgrad *</Label>
            <RadioGroup value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="kan_köras" id="kan" />
                <Label htmlFor="kan" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">Kan köras</div>
                  <div className="text-xs text-slate-500">Fordonet är körbart</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="bör_ej_köras" id="bor_ej" />
                <Label htmlFor="bor_ej" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm text-amber-600">Bör ej köras</div>
                  <div className="text-xs text-slate-500">Kan köras kortare sträckor</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="måste_stanna" id="maste" />
                <Label htmlFor="maste" className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm text-rose-600">Måste stanna</div>
                  <div className="text-xs text-slate-500">Akut - fordonet är inte körbart</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Kort beskrivning *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="T.ex. 'Punktering höger fram'"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detaljerad beskrivning *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Beskriv problemet så detaljerat som möjligt..."
              className="min-h-[80px] resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Plats</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Var inträffade felet?"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mileage">Mätarställning</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foton/videos (viktigt!)</Label>
            <div className="space-y-2">
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 bg-white/80 hover:bg-white rounded-full"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleImageUpload}
                className="hidden"
                id="issue-image-upload"
              />
              <label
                htmlFor="issue-image-upload"
                className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-slate-400 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <div className="text-center">
                    <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs text-slate-500">Lägg till foto</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[100px] bg-rose-600 hover:bg-rose-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rapportera'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}