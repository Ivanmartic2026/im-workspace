import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from '@/api/base44Client';
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Loader2, MapPin, Navigation, Clock, Merge, CheckCircle2 } from "lucide-react";

export default function RegisterTripModal({ open, onClose, trips = [], vehicleId, vehicleReg, onSuccess }) {
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    trip_type: 'tjänst',
    purpose: '',
    project_code: '',
    customer: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      setSelectedTrips([]);
      setFormData({
        trip_type: 'tjänst',
        purpose: '',
        project_code: '',
        customer: '',
        notes: ''
      });
    }
  }, [open]);

  const toggleTrip = (tripIndex) => {
    setSelectedTrips(prev => 
      prev.includes(tripIndex) 
        ? prev.filter(i => i !== tripIndex)
        : [...prev, tripIndex].sort((a, b) => a - b)
    );
  };

  const getMergedTripData = () => {
    if (selectedTrips.length === 0) return null;

    const selected = selectedTrips.map(i => trips[i]).sort((a, b) => 
      new Date(a.starttime) - new Date(b.starttime)
    );

    const firstTrip = selected[0];
    const lastTrip = selected[selected.length - 1];

    const totalDistance = selected.reduce((sum, trip) => sum + trip.tripdistance, 0);
    const totalTime = selected.reduce((sum, trip) => sum + trip.triptime, 0);

    return {
      start_time: new Date(firstTrip.starttime).toISOString(),
      end_time: new Date(lastTrip.endtime).toISOString(),
      distance_km: totalDistance / 1000,
      duration_minutes: totalTime / (1000 * 60),
      start_location: {
        latitude: firstTrip.startlat,
        longitude: firstTrip.startlon,
        address: firstTrip.startaddress || `${firstTrip.startlat}, ${firstTrip.startlon}`
      },
      end_location: {
        latitude: lastTrip.endlat,
        longitude: lastTrip.endlon,
        address: lastTrip.endaddress || `${lastTrip.endlat}, ${lastTrip.endlon}`
      }
    };
  };

  const handleSubmit = async () => {
    if (selectedTrips.length === 0) {
      alert('Välj minst en resa att registrera');
      return;
    }

    if (!formData.purpose && formData.trip_type === 'tjänst') {
      alert('Fyll i syfte för tjänsteresan');
      return;
    }

    setLoading(true);

    try {
      const mergedData = getMergedTripData();
      const user = await base44.auth.me();

      const journalEntry = {
        vehicle_id: vehicleId,
        registration_number: vehicleReg,
        driver_email: user.email,
        driver_name: user.full_name,
        start_time: mergedData.start_time,
        end_time: mergedData.end_time,
        start_location: mergedData.start_location,
        end_location: mergedData.end_location,
        distance_km: mergedData.distance_km,
        duration_minutes: mergedData.duration_minutes,
        trip_type: formData.trip_type,
        purpose: formData.purpose,
        project_code: formData.project_code,
        customer: formData.customer,
        notes: formData.notes,
        status: 'submitted'
      };

      await base44.entities.DrivingJournalEntry.create(journalEntry);
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error registering trip:', error);
      alert('Kunde inte registrera resan: ' + error.message);
    }

    setLoading(false);
  };

  const mergedData = getMergedTripData();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrera resa i körjournal</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trip Selection */}
          <div>
            <Label className="mb-3 block">Välj resor att registrera</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-slate-50">
              {trips.map((trip, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleTrip(idx)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTrips.includes(idx)
                      ? 'border-slate-900 bg-white shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={selectedTrips.includes(idx)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900">
                          {format(new Date(trip.starttime), 'HH:mm', { locale: sv })} - {format(new Date(trip.endtime), 'HH:mm', { locale: sv })}
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {(trip.tripdistance / 1000).toFixed(1)} km
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {Math.round(trip.triptime / (1000 * 60))} min • Snitt: {Math.round(trip.averagespeed * 3.6)} km/h
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merged Trip Summary */}
          {selectedTrips.length > 0 && mergedData && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                {selectedTrips.length > 1 && <Merge className="h-4 w-4 text-emerald-700" />}
                <h3 className="text-sm font-semibold text-emerald-900">
                  {selectedTrips.length === 1 ? 'Vald resa' : `${selectedTrips.length} resor sammanslagen`}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-emerald-700 mb-1">Total sträcka</p>
                  <p className="text-lg font-bold text-emerald-900">{mergedData.distance_km.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 mb-1">Total tid</p>
                  <p className="text-lg font-bold text-emerald-900">{Math.round(mergedData.duration_minutes)} min</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 mb-1">Tid</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {format(new Date(mergedData.start_time), 'HH:mm', { locale: sv })} - {format(new Date(mergedData.end_time), 'HH:mm', { locale: sv })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {selectedTrips.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label>Typ av resa</Label>
                <Select value={formData.trip_type} onValueChange={(value) => setFormData({...formData, trip_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tjänst">Tjänsteresa</SelectItem>
                    <SelectItem value="privat">Privatresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.trip_type === 'tjänst' && (
                <>
                  <div>
                    <Label>Syfte *</Label>
                    <Input
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      placeholder="T.ex. Kundbesök, leverans, service..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Projektkod</Label>
                      <Input
                        value={formData.project_code}
                        onChange={(e) => setFormData({...formData, project_code: e.target.value})}
                        placeholder="P12345"
                      />
                    </div>
                    <div>
                      <Label>Kund</Label>
                      <Input
                        value={formData.customer}
                        onChange={(e) => setFormData({...formData, customer: e.target.value})}
                        placeholder="Kundnamn"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>Anteckningar</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Övrig information..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || selectedTrips.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrerar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Registrera resa
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}