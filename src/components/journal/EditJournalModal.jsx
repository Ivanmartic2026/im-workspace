import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function EditJournalModal({ open, onClose, entry, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    trip_type: 'väntar',
    purpose: '',
    project_id: '',
    project_code: '',
    customer: '',
    notes: '',
    status: 'pending_review',
    start_time: '',
    end_time: '',
    distance_km: 0
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        trip_type: entry.trip_type || 'väntar',
        purpose: entry.purpose || '',
        project_id: entry.project_id || '',
        project_code: entry.project_code || '',
        customer: entry.customer || '',
        notes: entry.notes || '',
        status: entry.status,
        start_time: entry.start_time ? new Date(entry.start_time).toISOString().slice(0, 16) : '',
        end_time: entry.end_time ? new Date(entry.end_time).toISOString().slice(0, 16) : '',
        distance_km: entry.distance_km || 0
      });
    }
  }, [entry]);

  const handleProjectChange = (projectId) => {
    const selectedProject = projects.find(p => p.id === projectId);
    setFormData(prev => ({
      ...prev,
      project_id: projectId,
      project_code: selectedProject?.project_code || '',
      customer: selectedProject?.customer || prev.customer
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.trip_type || formData.trip_type === 'väntar') {
      alert('Välj typ av resa');
      return;
    }

    if (!formData.purpose?.trim()) {
      alert('Ange syfte med resan');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        ...formData,
        status: 'submitted'
      };
      
      // Konvertera tider och beräkna duration om ändrade
      if (formData.start_time && formData.end_time) {
        updateData.start_time = new Date(formData.start_time).toISOString();
        updateData.end_time = new Date(formData.end_time).toISOString();
        const duration = (new Date(formData.end_time) - new Date(formData.start_time)) / (1000 * 60);
        updateData.duration_minutes = duration;
      }
      
      await onSave(updateData);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Kunde inte spara: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Redigera körjournalspost</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_time">Starttid</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Sluttid</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="distance_km">Körsträcka (km)</Label>
            <Input
              id="distance_km"
              type="number"
              step="0.1"
              value={formData.distance_km}
              onChange={(e) => setFormData(prev => ({ ...prev, distance_km: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip_type">Typ av resa *</Label>
            <Select
              value={formData.trip_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, trip_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="väntar">Välj typ...</SelectItem>
                <SelectItem value="tjänst">Tjänsteresa</SelectItem>
                <SelectItem value="privat">Privatresa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Syfte med resan *</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              placeholder="T.ex. Kundbesök, möte, leverans..."
              className="min-h-[80px]"
              required
            />
          </div>

          {formData.trip_type === 'tjänst' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="project">Projekt (valfritt)</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={handleProjectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj projekt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Inget projekt</SelectItem>
                    {projects.filter(p => p.status === 'pågående').map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.project_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer">Kund/Uppdragsgivare (valfritt)</Label>
                <Input
                  id="customer"
                  value={formData.customer}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                  placeholder="T.ex. Företag AB"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Övriga anteckningar (valfritt)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Eventuella kommentarer..."
              className="min-h-[60px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Skicka in'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}