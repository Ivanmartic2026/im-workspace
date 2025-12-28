import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from "framer-motion";

export default function EditVehicle() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      const vehicles = await base44.entities.Vehicle.filter({ id: vehicleId });
      return vehicles[0];
    },
    enabled: !!vehicleId,
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        registration_number: vehicle.registration_number || '',
        gps_device_id: vehicle.gps_device_id || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        vehicle_type: vehicle.vehicle_type || 'personbil',
        fuel_type: vehicle.fuel_type || 'bensin',
        fuel_cards: vehicle.fuel_cards || [],
        current_mileage: vehicle.current_mileage || '',
        next_service_date: vehicle.next_service_date || '',
        next_service_mileage: vehicle.next_service_mileage || '',
        next_inspection_date: vehicle.next_inspection_date || '',
        tire_change_date: vehicle.tire_change_date || '',
        status: vehicle.status || 'aktiv',
        notes: vehicle.notes || ''
      });
    }
  }, [vehicle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        year: formData.year ? Number(formData.year) : undefined,
        current_mileage: formData.current_mileage ? Number(formData.current_mileage) : undefined,
        next_service_mileage: formData.next_service_mileage ? Number(formData.next_service_mileage) : undefined,
      };

      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === '') {
          delete dataToSave[key];
        }
      });

      await base44.entities.Vehicle.update(vehicleId, dataToSave);
      navigate(createPageUrl('VehicleDetails') + `?id=${vehicleId}`);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Ett fel uppstod när fordonet skulle uppdateras.');
    }

    setLoading(false);
  };

  if (isLoading || !formData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('VehicleDetails') + `?id=${vehicleId}`)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka
          </Button>

          <h1 className="text-2xl font-bold text-slate-900">Redigera fordon</h1>
          <p className="text-sm text-slate-500 mt-1">{vehicle.registration_number}</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Grunduppgifter</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registration_number">Registreringsnummer *</Label>
                    <Input
                      id="registration_number"
                      value={formData.registration_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value.toUpperCase() }))}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gps_device_id">GPS Device ID</Label>
                    <Input
                      id="gps_device_id"
                      value={formData.gps_device_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, gps_device_id: e.target.value }))}
                      className="h-11"
                      placeholder="GPS Device ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Märke *</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Modell *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      className="h-11"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Årsmodell</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="h-11">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Fordonstyp</Label>
                    <Select
                      value={formData.vehicle_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personbil">Personbil</SelectItem>
                        <SelectItem value="lätt lastbil">Lätt lastbil</SelectItem>
                        <SelectItem value="lastbil">Lastbil</SelectItem>
                        <SelectItem value="skåpbil">Skåpbil</SelectItem>
                        <SelectItem value="annat">Annat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuel_type">Bränsletyp</Label>
                    <Select
                      value={formData.fuel_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fuel_type: value }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bensin">Bensin</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="el">El</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="plugin-hybrid">Plugin-hybrid</SelectItem>
                        <SelectItem value="annat">Annat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_mileage">Nuvarande mätarställning (km)</Label>
                  <Input
                    id="current_mileage"
                    type="number"
                    value={formData.current_mileage}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_mileage: e.target.value }))}
                    className="h-11"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Service & Underhåll</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="next_service_date">Nästa service (datum)</Label>
                    <Input
                      id="next_service_date"
                      type="date"
                      value={formData.next_service_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, next_service_date: e.target.value }))}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="next_service_mileage">Nästa service (km)</Label>
                    <Input
                      id="next_service_mileage"
                      type="number"
                      value={formData.next_service_mileage}
                      onChange={(e) => setFormData(prev => ({ ...prev, next_service_mileage: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="next_inspection_date">Nästa besiktning</Label>
                    <Input
                      id="next_inspection_date"
                      type="date"
                      value={formData.next_inspection_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, next_inspection_date: e.target.value }))}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tire_change_date">Däckbyte</Label>
                    <Input
                      id="tire_change_date"
                      type="date"
                      value={formData.tire_change_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, tire_change_date: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Tankkort</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      fuel_cards: [...(prev.fuel_cards || []), { provider: '', card_number: '', pin_code: '' }]
                    }))}
                  >
                    Lägg till kort
                  </Button>
                </div>

                {formData.fuel_cards?.length > 0 ? (
                  <div className="space-y-3">
                    {formData.fuel_cards.map((card, index) => (
                      <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">Kort {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              fuel_cards: prev.fuel_cards.filter((_, i) => i !== index)
                            }))}
                            className="h-7 text-rose-600 hover:text-rose-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Leverantör</Label>
                            <Input
                              value={card.provider}
                              onChange={(e) => {
                                const newCards = [...formData.fuel_cards];
                                newCards[index].provider = e.target.value;
                                setFormData(prev => ({ ...prev, fuel_cards: newCards }));
                              }}
                              placeholder="Circle K"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Kortnummer</Label>
                            <Input
                              value={card.card_number}
                              onChange={(e) => {
                                const newCards = [...formData.fuel_cards];
                                newCards[index].card_number = e.target.value;
                                setFormData(prev => ({ ...prev, fuel_cards: newCards }));
                              }}
                              placeholder="123456"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">PIN/Kod</Label>
                            <Input
                              value={card.pin_code}
                              onChange={(e) => {
                                const newCards = [...formData.fuel_cards];
                                newCards[index].pin_code = e.target.value;
                                setFormData(prev => ({ ...prev, fuel_cards: newCards }));
                              }}
                              placeholder="1234"
                              className="h-9"
                              type="password"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">Inga tankkort tillagda</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Anteckningar</h3>
                <div className="space-y-2">
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Övriga anteckningar om fordonet..."
                    className="min-h-[100px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('VehicleDetails') + `?id=${vehicleId}`)}
              className="flex-1 h-12 rounded-2xl"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.registration_number || !formData.make || !formData.model}
              className="flex-1 h-12 rounded-2xl shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Spara ändringar'
              )}
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}