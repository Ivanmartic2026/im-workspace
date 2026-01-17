import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, PlusCircle } from "lucide-react";

export default function ManualTripModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '09:00',
    distance_km: '',
    trip_type: 'tjänst',
    purpose: '',
    project_id: '',
    customer: '',
    notes: ''
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    initialData: []
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  const handleSubmit = async () => {
    if (!formData.vehicle_id || !formData.distance_km) {
      alert('Fyll i fordon och körsträcka');
      return;
    }

    if (formData.trip_type === 'tjänst' && !formData.purpose) {
      alert('Fyll i syfte för tjänsteresan');
      return;
    }

    setLoading(true);

    try {
      const user = await base44.auth.me();
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      const selectedProject = projects.find(p => p.id === formData.project_id);

      const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.end_time}:00`);
      const durationMinutes = (endDateTime - startDateTime) / (1000 * 60);

      const journalEntry = {
        vehicle_id: formData.vehicle_id,
        registration_number: vehicle?.registration_number || 'Okänt',
        driver_email: user.email,
        driver_name: user.full_name,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        distance_km: parseFloat(formData.distance_km),
        duration_minutes: durationMinutes,
        trip_type: formData.trip_type,
        purpose: formData.purpose,
        project_id: formData.project_id || null,
        project_code: selectedProject?.project_code || null,
        customer: formData.customer || selectedProject?.customer || null,
        notes: formData.notes,
        status: 'submitted',
        start_location: { address: 'Manuellt tillagd' },
        end_location: { address: 'Manuellt tillagd' },
        is_manual: true,
        manual_reason: 'Manuellt registrerad av användare',
        change_history: [{
          timestamp: new Date().toISOString(),
          changed_by: user.email,
          change_type: 'created',
          comment: 'Manuellt skapad resa'
        }]
      };

      await base44.entities.DrivingJournalEntry.create(journalEntry);
      
      if (onSuccess) onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        vehicle_id: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '09:00',
        distance_km: '',
        trip_type: 'tjänst',
        purpose: '',
        project_id: '',
        customer: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating manual trip:', error);
      alert('Kunde inte skapa resan: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lägg till resa manuellt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Fordon *</Label>
            <Select value={formData.vehicle_id} onValueChange={(value) => setFormData({...formData, vehicle_id: value})}>
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Datum *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <Label>Starttid *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              />
            </div>
            <div>
              <Label>Sluttid *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Körsträcka (km) *</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.distance_km}
              onChange={(e) => setFormData({...formData, distance_km: e.target.value})}
              placeholder="T.ex. 45.5"
            />
          </div>

          <div>
            <Label>Typ av resa *</Label>
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
                  <Label>Projekt</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({...formData, project_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj projekt (valfritt)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.filter(p => p.status === 'pågående').map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} ({project.project_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

          <div className="flex gap-3 pt-4">
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
              disabled={loading}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Skapar...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Lägg till resa
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}