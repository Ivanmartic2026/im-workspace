import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BookServiceModal({ open, onClose, onSuccess, vehicles, selectedVehicle, userEmail }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: selectedVehicle?.id || '',
    title: '',
    description: '',
    workshop: '',
    workshop_date: '',
    images: []
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, file_url]
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Kunde inte ladda upp bilden');
    }
    setUploadingImage(false);
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
        vehicle_id: formData.vehicle_id,
        registration_number: vehicle?.registration_number,
        issue_type: 'service',
        severity: 'kan_köras',
        title: formData.title,
        description: formData.description,
        workshop: formData.workshop,
        workshop_date: formData.workshop_date || undefined,
        images: formData.images,
        status: 'väntar_verkstad',
        priority: 'normal',
        history: [{
          timestamp: new Date().toISOString(),
          user: userEmail,
          action: 'Skapad',
          comment: 'Serviceärende skapat'
        }]
      });

      // Create news post
      const vehicleName = vehicle?.gps_device_id || vehicle?.registration_number || 'Fordon';
      const dateInfo = formData.workshop_date ? `\n**Datum:** ${formData.workshop_date}` : '';
      const workshopInfo = formData.workshop ? `\n**Verkstad:** ${formData.workshop}` : '';
      
      await base44.entities.NewsPost.create({
        title: `🔧 Service bokad: ${formData.title}`,
        content: `**Fordon:** ${vehicleName}${dateInfo}${workshopInfo}\n\n${formData.description}`,
        category: 'allmänt',
        is_important: false,
        image_url: formData.images?.[0] || null
      });

      setFormData({
        vehicle_id: selectedVehicle?.id || '',
        title: '',
        description: '',
        workshop: '',
        workshop_date: '',
        images: []
      });

      onSuccess();
    } catch (error) {
      console.error('Error booking service:', error);
      alert('Kunde inte boka service');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Boka service</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Fordon *</Label>
            <Select
              value={formData.vehicle_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value }))}
              required
            >
              <SelectTrigger id="vehicle">
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

          <div className="space-y-2">
            <Label htmlFor="title">Typ av service *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="t.ex. Vanlig service, Besiktning, Däckbyte"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Beskriv vad som behöver göras..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workshop">Verkstad</Label>
            <Input
              id="workshop"
              value={formData.workshop}
              onChange={(e) => setFormData(prev => ({ ...prev, workshop: e.target.value }))}
              placeholder="Namn på verkstad"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workshop_date">Datum för service</Label>
            <Input
              id="workshop_date"
              type="date"
              value={formData.workshop_date}
              onChange={(e) => setFormData(prev => ({ ...prev, workshop_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Bilder (valfritt)</Label>
            <div className="space-y-3">
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt={`Bild ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-500">Ladda upp bild</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Avbryt
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.vehicle_id || !formData.title || !formData.description}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bokar...
                </>
              ) : (
                'Boka service'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}