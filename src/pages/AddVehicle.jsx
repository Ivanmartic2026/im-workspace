import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, Loader2, Sparkles, X, Image as ImageIcon } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from "framer-motion";

export default function AddVehicle() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [formData, setFormData] = useState({
    registration_number: '',
    vin: '',
    make: '',
    model: '',
    year: '',
    vehicle_type: 'personbil',
    fuel_type: 'bensin',
    fuel_card_provider: '',
    fuel_card_number: '',
    is_pool_vehicle: false,
    assigned_driver: '',
    current_mileage: '',
    next_service_date: '',
    next_service_mileage: '',
    next_inspection_date: '',
    tire_change_date: '',
    insurance_document_url: '',
    lease_document_url: '',
    manual_url: '',
    status: 'aktiv',
    image_url: '',
    notes: ''
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAnalyzing(true);

    try {
      // Upload image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedImage(file_url);

      // Analyze image with AI
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysera denna bild av fordonsinformation och extrahera följande uppgifter om fordonet:
        - Registreringsnummer
        - Märke (t.ex. Volvo, Tesla)
        - Modell
        - Årsmodell (endast året som nummer)
        - Fordonstyp (välj en av: personbil, lätt lastbil, lastbil, skåpbil, annat)
        - Bränsletyp (välj en av: bensin, diesel, el, hybrid, plugin-hybrid, annat)
        
        Om någon uppgift inte finns synlig i bilden, använd null för det fältet.
        Svara endast med strukturerad data enligt schemat.`,
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

      // Update form with extracted data
      setFormData(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(response).filter(([_, value]) => value !== null)
        ),
        image_url: file_url
      }));

    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('Kunde inte analysera bilden. Du kan fortfarande fylla i uppgifterna manuellt.');
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
        next_service_mileage: formData.next_service_mileage ? Number(formData.next_service_mileage) : undefined,
      };

      // Remove empty strings
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === '') {
          delete dataToSave[key];
        }
      });

      await base44.entities.Vehicle.create(dataToSave);
      navigate(createPageUrl('Vehicles'));
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Vehicles'))}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka
          </Button>

          <h1 className="text-2xl font-bold text-slate-900">Lägg till fordon</h1>
          <p className="text-sm text-slate-500 mt-1">Fyll i fordonsuppgifter eller ladda upp en bild</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <Label className="text-sm font-medium text-slate-700 mb-3 block">
                  Ladda upp bild med fordonsuppgifter
                </Label>
                <p className="text-xs text-slate-500 mb-4">
                  Ladda upp en skärmdump från bilpriser.se eller liknande så analyserar AI bilden och fyller i uppgifterna automatiskt
                </p>

                {!uploadedImage ? (
                  <label className="relative flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={analyzing}
                    />
                    {analyzing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                        <p className="text-sm text-slate-600 font-medium">Analyserar bild...</p>
                        <p className="text-xs text-slate-400">AI extraherar fordonsuppgifter</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-700">Klicka för att ladda upp</p>
                          <p className="text-xs text-slate-400 mt-1">PNG, JPG upp till 10MB</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-xs font-medium text-indigo-700">AI-analys</span>
                        </div>
                      </div>
                    )}
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={uploadedImage} alt="Fordonsuppgifter" className="w-full h-48 object-cover" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeImage}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-md"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/90 backdrop-blur-sm rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span className="text-xs font-medium text-white">Analyserad</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
                      placeholder="ABC123"
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN-nummer</Label>
                    <Input
                      id="vin"
                      value={formData.vin}
                      onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                      placeholder="VIN"
                      className="h-11"
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
                      placeholder="Volvo"
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
                      placeholder="V60"
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
                      placeholder="2023"
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
                    placeholder="0"
                    className="h-11"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Service & Maintenance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
                      placeholder="0"
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

          {/* Fuel Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Tankkort</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuel_card_provider">Leverantör</Label>
                    <Input
                      id="fuel_card_provider"
                      value={formData.fuel_card_provider}
                      onChange={(e) => setFormData(prev => ({ ...prev, fuel_card_provider: e.target.value }))}
                      placeholder="t.ex. Circle K"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuel_card_number">Kortnummer</Label>
                    <Input
                      id="fuel_card_number"
                      value={formData.fuel_card_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, fuel_card_number: e.target.value }))}
                      placeholder="Kortnummer"
                      className="h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
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

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex gap-3"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('Vehicles'))}
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
                'Spara fordon'
              )}
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}