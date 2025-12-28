import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2, Camera, X } from "lucide-react";

export default function FuelLogModal({ open, onClose, onSuccess, vehicles, selectedVehicle, userEmail }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: selectedVehicle?.id || '',
    date: new Date().toISOString().slice(0, 16),
    liters: '',
    amount: '',
    mileage: selectedVehicle?.current_mileage || '',
    fuel_type: selectedVehicle?.fuel_type || '',
    station: '',
    receipt_url: '',
    notes: ''
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, receipt_url: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      const pricePerLiter = formData.liters ? (parseFloat(formData.amount) / parseFloat(formData.liters)).toFixed(2) : null;
      
      await base44.entities.FuelLog.create({
        ...formData,
        registration_number: vehicle?.registration_number,
        price_per_liter: pricePerLiter,
        driver_email: userEmail,
        liters: formData.liters ? parseFloat(formData.liters) : null,
        amount: parseFloat(formData.amount),
        mileage: parseInt(formData.mileage)
      });

      // Update vehicle mileage
      if (vehicle && formData.mileage) {
        await base44.entities.Vehicle.update(vehicle.id, {
          current_mileage: parseInt(formData.mileage)
        });
      }

      onSuccess();
      onClose();
      setFormData({
        vehicle_id: '',
        date: new Date().toISOString().slice(0, 16),
        liters: '',
        amount: '',
        mileage: '',
        fuel_type: '',
        station: '',
        receipt_url: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating fuel log:', error);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">⛽ Registrera tankning</DialogTitle>
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
                  mileage: vehicle?.current_mileage || '',
                  fuel_type: vehicle?.fuel_type || ''
                }));
              }}
              required
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Välj fordon" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.filter(v => v.status === 'aktiv').map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number} - {vehicle.make} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Datum & tid *</Label>
            <Input
              id="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="h-11"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileage">Mätarställning (km) *</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                placeholder="12345"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Belopp (kr) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="650"
                className="h-11"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liters">Liter (valfritt)</Label>
              <Input
                id="liters"
                type="number"
                step="0.01"
                value={formData.liters}
                onChange={(e) => setFormData(prev => ({ ...prev, liters: e.target.value }))}
                placeholder="45.5"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station">Station</Label>
              <Input
                id="station"
                value={formData.station}
                onChange={(e) => setFormData(prev => ({ ...prev, station: e.target.value }))}
                placeholder="Circle K"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kvitto (foto)</Label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="receipt-upload"
              />
              {formData.receipt_url ? (
                <div className="relative h-32 rounded-lg border overflow-hidden bg-slate-50">
                  <img src={formData.receipt_url} alt="" className="h-full w-full object-cover" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 bg-white/80 hover:bg-white rounded-full"
                    onClick={() => setFormData(prev => ({ ...prev, receipt_url: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="receipt-upload"
                  className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:border-slate-400 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <div className="text-center">
                      <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-500">Ta foto av kvitto</span>
                    </div>
                  )}
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notering</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Valfri kommentar..."
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[100px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Spara'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}