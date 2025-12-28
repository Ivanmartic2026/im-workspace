import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Loader2, CalendarDays } from "lucide-react";
import { differenceInDays, format } from "date-fns";

export default function CreateLeaveModal({ open, onClose, onSuccess, userEmail }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'semester',
    start_date: '',
    end_date: '',
    hours_per_day: 8,
    reason: ''
  });

  const days = formData.start_date && formData.end_date 
    ? differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await base44.entities.LeaveRequest.create({
        ...formData,
        employee_email: userEmail,
        days,
        status: 'pending'
      });
      onSuccess();
      onClose();
      setFormData({
        type: 'semester',
        start_date: '',
        end_date: '',
        hours_per_day: 8,
        reason: ''
      });
    } catch (error) {
      console.error('Error creating leave request:', error);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Ansök om ledighet</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Typ av ledighet</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semester">Semester</SelectItem>
                <SelectItem value="vab">VAB</SelectItem>
                <SelectItem value="sjuk">Sjukfrånvaro</SelectItem>
                <SelectItem value="tjänstledigt">Tjänstledigt</SelectItem>
                <SelectItem value="föräldraledigt">Föräldraledigt</SelectItem>
                <SelectItem value="annat">Annat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Från datum</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Till datum</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                min={formData.start_date}
                className="h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours_per_day">Timmar per dag</Label>
            <Input
              id="hours_per_day"
              type="number"
              value={formData.hours_per_day}
              onChange={(e) => setFormData(prev => ({ ...prev, hours_per_day: Number(e.target.value) }))}
              className="h-11"
              min="0.5"
              max="24"
              step="0.5"
              required
            />
          </div>

          {days > 0 && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">
                Totalt <span className="font-semibold">{days} {days === 1 ? 'dag' : 'dagar'}</span>
                {formData.hours_per_day && formData.hours_per_day !== 8 && (
                  <span className="ml-2">({formData.hours_per_day}h/dag = {days * formData.hours_per_day}h totalt)</span>
                )}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Anledning (valfritt)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Beskriv anledningen..."
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading || days <= 0} className="min-w-[100px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Skicka ansökan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}