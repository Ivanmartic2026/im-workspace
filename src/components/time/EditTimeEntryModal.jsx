import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useQuery } from '@tanstack/react-query';
import ProjectAllocationEditor from './ProjectAllocationEditor';

export default function EditTimeEntryModal({ open, onClose, entry, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showProjectAllocation, setShowProjectAllocation] = useState(false);
  const [formData, setFormData] = useState({
    clock_in_time: '',
    clock_out_time: '',
    edit_reason: ''
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        clock_in_time: entry.clock_in_time ? format(new Date(entry.clock_in_time), "yyyy-MM-dd'T'HH:mm") : '',
        clock_out_time: entry.clock_out_time ? format(new Date(entry.clock_out_time), "yyyy-MM-dd'T'HH:mm") : '',
        edit_reason: ''
      });
    }
  }, [entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.edit_reason || formData.edit_reason.trim().length < 5) {
      alert('Vänligen ange en förklaring till ändringen (minst 5 tecken)');
      return;
    }

    setLoading(true);
    
    try {
      const user = await base44.auth.me();
      
      // Calculate new total hours
      const clockIn = new Date(formData.clock_in_time);
      const clockOut = formData.clock_out_time ? new Date(formData.clock_out_time) : null;
      const totalHours = clockOut ? (clockOut - clockIn) / (1000 * 60 * 60) : null;

      const updateData = {
        original_clock_in_time: entry.original_clock_in_time || entry.clock_in_time,
        original_clock_out_time: entry.original_clock_out_time || entry.clock_out_time,
        clock_in_time: formData.clock_in_time,
        clock_out_time: formData.clock_out_time || null,
        total_hours: totalHours ? Number(totalHours.toFixed(2)) : entry.total_hours,
        edit_reason: formData.edit_reason,
        edited_by: user.email,
        edited_at: new Date().toISOString(),
        status: 'pending_review'
      };

      await base44.entities.TimeEntry.update(entry.id, updateData);
      
      // Show project allocation screen
      setLoading(false);
      setShowProjectAllocation(true);
    } catch (error) {
      console.error('Error updating time entry:', error);
      alert('Kunde inte uppdatera tidrapport: ' + error.message);
      setLoading(false);
    }
  };

  const handleSaveProjectAllocation = async (allocations) => {
    setLoading(true);
    
    try {
      const clockIn = new Date(formData.clock_in_time);
      const clockOut = formData.clock_out_time ? new Date(formData.clock_out_time) : null;
      const totalHours = clockOut ? (clockOut - clockIn) / (1000 * 60 * 60) : 0;
      const totalBreakMinutes = entry.total_break_minutes || 0;
      const netHours = totalHours - (totalBreakMinutes / 60);

      await base44.entities.TimeEntry.update(entry.id, {
        project_allocations: allocations,
        total_hours: Number(netHours.toFixed(2))
      });

      // Check project budget
      try {
        await base44.functions.invoke('checkProjectBudget', { time_entry_id: entry.id });
      } catch (budgetError) {
        console.error('Error checking project budget:', budgetError);
      }

      onSuccess();
      onClose();
      setFormData({ clock_in_time: '', clock_out_time: '', edit_reason: '' });
      setShowProjectAllocation(false);
    } catch (error) {
      console.error('Error saving project allocation:', error);
      alert('Kunde inte spara projektfördelning: ' + error.message);
    }
    
    setLoading(false);
  };

  if (!entry) return null;

  if (showProjectAllocation) {
    const clockIn = new Date(formData.clock_in_time);
    const clockOut = formData.clock_out_time ? new Date(formData.clock_out_time) : null;
    const totalHours = clockOut ? (clockOut - clockIn) / (1000 * 60 * 60) : 0;
    const totalBreakMinutes = entry.total_break_minutes || 0;
    const netHours = totalHours - (totalBreakMinutes / 60);

    const tempEntry = {
      ...entry,
      clock_in_time: formData.clock_in_time,
      clock_out_time: formData.clock_out_time,
      total_hours: Number(netHours.toFixed(2))
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fördela arbetstid</DialogTitle>
          </DialogHeader>
          <ProjectAllocationEditor
            timeEntry={tempEntry}
            projects={projects}
            onSave={handleSaveProjectAllocation}
            onCancel={() => {
              setShowProjectAllocation(false);
              onClose();
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Korrigera tidrapport</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 mb-1">Ursprunglig tid:</p>
            <p className="text-sm font-medium text-blue-900">
              {format(new Date(entry.clock_in_time), 'PPp', { locale: sv })}
              {entry.clock_out_time && ` - ${format(new Date(entry.clock_out_time), 'p', { locale: sv })}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clock_in_time">Ny instämplingstid</Label>
            <Input
              id="clock_in_time"
              type="datetime-local"
              value={formData.clock_in_time}
              onChange={(e) => setFormData(prev => ({ ...prev, clock_in_time: e.target.value }))}
              className="h-11"
              required
            />
          </div>

          {entry.clock_out_time && (
            <div className="space-y-2">
              <Label htmlFor="clock_out_time">Ny utstämplingstid</Label>
              <Input
                id="clock_out_time"
                type="datetime-local"
                value={formData.clock_out_time}
                onChange={(e) => setFormData(prev => ({ ...prev, clock_out_time: e.target.value }))}
                className="h-11"
                min={formData.clock_in_time}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit_reason">Förklaring till ändring *</Label>
            <Textarea
              id="edit_reason"
              value={formData.edit_reason}
              onChange={(e) => setFormData(prev => ({ ...prev, edit_reason: e.target.value }))}
              placeholder="Beskriv varför du ändrar tiden..."
              className="min-h-[80px] resize-none"
              required
            />
            <p className="text-xs text-slate-500">Minst 5 tecken krävs</p>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Ändringen skickas till granskning och måste godkännas av en administratör.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[100px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Skicka för granskning'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}