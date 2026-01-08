import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AddVehicleModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [formData, setFormData] = useState({
    registration_number: '',
    gps_device_id: '',
    make: '',
    model: '',
    year: '',
    category: 'personbil',
    vehicle_type: 'personbil',
    fuel_type: 'bensin',
    assigned_driver: '',
    current_mileage: '',
    next_service_date: '',
    next_inspection_date: '',
    status: 'aktiv',
    image_url: '',
    notes: ''
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAnalyzing(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedImage(file_url);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysera denna bild och extrahera fordonsuppgifter: registreringsnummer, märke, modell, årsmodell, fordonstyp, bränsletyp. Om något saknas, använd null.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            registration_number: { type: ["string", "null"] },
            make: { type: ["string", "null"] },
            model: { type: ["string", "null"] },
            year: { type: ["number", "null"] },
            vehicle_type: { type: ["string", "null"] },
            fuel_type: { type: ["string", "null"] }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(response).filter(([_, value]) => value !== null)
        ),
        image_url: file_url
      }));
    } catch (error) {
      console.error('Error analyzing image:', error);
    }

    setAnalyzing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        year: formData.year ? Number(formData.year) : undefined,
        current_mileage: formData.current_mileage ? Number(formData.current_mileage) : undefined,
      };

      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === '') {
          delete dataToSave[key];
        }
      });

      await base44.entities.Vehicle.create(dataToSave);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating vehicle:', error);
      alert('Ett fel uppstod när fordonet skulle sparas.');
    }

    setLoading(false);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Lägg till fordon</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label className="text-sm mb-2 block">Ladda upp bild (valfritt)</Label>
              {!uploadedImage ? (
                <label className="relative flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={analyzing}
                  />
                  {analyzing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      <p className="text-xs text-slate-600">Analyserar bild...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <p className="text-xs text-slate-600">Klicka för att ladda upp</p>
                      <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-full">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span className="text-xs text-indigo-700">AI-analys</span>
                      </div>
                    </div>
                  )}
                </label>
              ) : (
                <div className="relative rounded-lg overflow-hidden">
                  <img src={uploadedImage} alt="Fordon" className="w-full h-32 object-cover" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeImage}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Registreringsnummer *</Label>
                <Input
                  value={formData.registration_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value.toUpperCase() }))}
                  placeholder="ABC123"
                  required
                />
              </div>
              <div>
                <Label>GPS Device ID</Label>
                <Input
                  value={formData.gps_device_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, gps_device_id: e.target.value }))}
                  placeholder="GPS Device ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Märke *</Label>
                <Input
                  value={formData.make}
                  onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                  placeholder="Volvo"
                  required
                />
              </div>
              <div>
                <Label>Modell *</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="V60"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Årsmodell</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="2023"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktiv">Aktiv</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="skadad">Skadad</SelectItem>
                    <SelectItem value="avställd">Avställd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategori</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personbil">Personbil</SelectItem>
                    <SelectItem value="lätt lastbil">Lätt lastbil</SelectItem>
                    <SelectItem value="lastbil">Lastbil</SelectItem>
                    <SelectItem value="skåpbil">Skåpbil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bränsletyp</Label>
                <Select value={formData.fuel_type} onValueChange={(value) => setFormData(prev => ({ ...prev, fuel_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bensin">Bensin</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="el">El</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Förare</Label>
              <Select value={formData.assigned_driver} onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_driver: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj förare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Ingen förare</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.user_email}>
                      {emp.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nuvarande mätarställning (km)</Label>
              <Input
                type="number"
                value={formData.current_mileage}
                onChange={(e) => setFormData(prev => ({ ...prev, current_mileage: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nästa service</Label>
                <Input
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, next_service_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Nästa besiktning</Label>
                <Input
                  type="date"
                  value={formData.next_inspection_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, next_inspection_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Anteckningar</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Övriga anteckningar..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.registration_number || !formData.make || !formData.model}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  'Spara fordon'
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}