import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Loader2, MapPin, Navigation, Clock, Merge, CheckCircle2, CheckSquare } from "lucide-react";

export default function RegisterTripModal({ open, onClose, trips = [], vehicleId, vehicleReg, onSuccess }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  useEffect(() => {
    if (open && trips.length > 0) {
      const initialSuggestions = trips.map(trip => ({
        trip,
        trip_type: 'tjänst',
        purpose: '',
        project_id: '',
        customer: '',
        notes: '',
        approved: false
      }));
      setSuggestions(initialSuggestions);
    }
  }, [open, trips]);

  const updateSuggestion = (index, field, value) => {
    setSuggestions(prev => prev.map((s, i) => 
      i === index ? { ...s, [field]: value } : s
    ));
  };

  const toggleApproval = (index) => {
    setSuggestions(prev => prev.map((s, i) => 
      i === index ? { ...s, approved: !s.approved } : s
    ));
  };

  const approveAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, approved: true })));
  };

  const handleSubmit = async () => {
    const approved = suggestions.filter(s => s.approved);
    
    if (approved.length === 0) {
      alert('Godkänn minst en resa för att registrera');
      return;
    }

    for (const suggestion of approved) {
      if (suggestion.trip_type === 'tjänst' && !suggestion.purpose) {
        alert('Fyll i syfte för alla tjänsteresor');
        return;
      }
    }

    setLoading(true);

    try {
      const user = await base44.auth.me();

      for (const suggestion of approved) {
        const selectedProject = projects.find(p => p.id === suggestion.project_id);
        const trip = suggestion.trip;

        const journalEntry = {
          vehicle_id: vehicleId,
          registration_number: vehicleReg,
          gps_trip_id: trip.tripid?.toString(),
          driver_email: user.email,
          driver_name: user.full_name,
          start_time: new Date(trip.begintime * 1000).toISOString(),
          end_time: new Date(trip.endtime * 1000).toISOString(),
          start_location: {
            latitude: trip.beginlocation?.latitude,
            longitude: trip.beginlocation?.longitude,
            address: trip.beginlocation?.address || `${trip.beginlocation?.latitude?.toFixed(5)}, ${trip.beginlocation?.longitude?.toFixed(5)}`
          },
          end_location: {
            latitude: trip.endlocation?.latitude,
            longitude: trip.endlocation?.longitude,
            address: trip.endlocation?.address || `${trip.endlocation?.latitude?.toFixed(5)}, ${trip.endlocation?.longitude?.toFixed(5)}`
          },
          distance_km: trip.mileage || 0,
          duration_minutes: (trip.endtime - trip.begintime) / 60,
          trip_type: suggestion.trip_type,
          purpose: suggestion.purpose,
          project_id: suggestion.project_id || null,
          project_code: selectedProject?.project_code || null,
          customer: suggestion.customer || selectedProject?.customer || null,
          notes: suggestion.notes,
          status: 'submitted'
        };

        await base44.entities.DrivingJournalEntry.create(journalEntry);
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error registering trips:', error);
      alert('Kunde inte registrera resorna: ' + error.message);
    }

    setLoading(false);
  };

  const approvedCount = suggestions.filter(s => s.approved).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Granska och godkänn resor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header with approve all */}
          <div className="flex items-center justify-between pb-3 border-b">
            <p className="text-sm text-slate-600">
              {approvedCount} av {suggestions.length} resor godkända
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={approveAll}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Godkänn alla
            </Button>
          </div>

          {/* Suggestions list */}
          <div className="space-y-4">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-lg p-4 transition-all ${
                  suggestion.approved 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Trip header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">
                        {format(new Date(suggestion.trip.begintime * 1000), 'EEE d MMM, HH:mm', { locale: sv })} - {format(new Date(suggestion.trip.endtime * 1000), 'HH:mm', { locale: sv })}
                      </p>
                      <Badge>{(suggestion.trip.mileage || 0).toFixed(1)} km</Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {suggestion.trip.beginlocation?.address || 'Start'} → {suggestion.trip.endlocation?.address || 'Slut'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={suggestion.approved ? "default" : "outline"}
                    onClick={() => toggleApproval(idx)}
                    className={suggestion.approved ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {suggestion.approved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Godkänd
                      </>
                    ) : (
                      'Godkänn'
                    )}
                  </Button>
                </div>

                {/* Form fields */}
                <div className="space-y-3 mt-3 pt-3 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Typ av resa</Label>
                      <Select 
                        value={suggestion.trip_type} 
                        onValueChange={(value) => updateSuggestion(idx, 'trip_type', value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tjänst">Tjänsteresa</SelectItem>
                          <SelectItem value="privat">Privatresa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {suggestion.trip_type === 'tjänst' && (
                      <div>
                        <Label className="text-xs">Syfte *</Label>
                        <Input
                          className="h-9 text-sm"
                          value={suggestion.purpose}
                          onChange={(e) => updateSuggestion(idx, 'purpose', e.target.value)}
                          placeholder="T.ex. Kundbesök..."
                        />
                      </div>
                    )}
                  </div>

                  {suggestion.trip_type === 'tjänst' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Projekt</Label>
                        <Select
                          value={suggestion.project_id}
                          onValueChange={(value) => updateSuggestion(idx, 'project_id', value)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Välj projekt" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.filter(p => p.status === 'pågående').map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Kund</Label>
                        <Input
                          className="h-9 text-sm"
                          value={suggestion.customer}
                          onChange={(e) => updateSuggestion(idx, 'customer', e.target.value)}
                          placeholder="Kundnamn"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Anteckningar</Label>
                    <Textarea
                      className="text-sm"
                      value={suggestion.notes}
                      onChange={(e) => updateSuggestion(idx, 'notes', e.target.value)}
                      placeholder="Övrig information..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t">
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
              disabled={loading || approvedCount === 0}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrerar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Registrera {approvedCount} {approvedCount === 1 ? 'resa' : 'resor'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}