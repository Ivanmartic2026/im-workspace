import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function EditJournalModal({ open, onClose, entry, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    trip_type: 'väntar',
    purpose: '',
    project_code: '',
    customer: '',
    notes: '',
    status: 'pending_review'
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        trip_type: entry.trip_type || 'väntar',
        purpose: entry.purpose || '',
        project_code: entry.project_code || '',
        customer: entry.customer || '',
        notes: entry.notes || '',
        status: entry.status
      });
    }
  }, [entry]);

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
      await onSave({
        ...formData,
        status: 'submitted'
      });
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
                <Label htmlFor="project_code">Projektkod (valfritt)</Label>
                <Input
                  id="project_code"
                  value={formData.project_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_code: e.target.value }))}
                  placeholder="T.ex. PRJ-2024-001"
                />
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