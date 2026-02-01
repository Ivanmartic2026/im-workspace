import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, MapPin, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function RequestTimeAdjustmentModal({ open, onClose, timeEntry, onSubmit }) {
  const [adjustedClockIn, setAdjustedClockIn] = useState(
    timeEntry?.clock_in_time ? format(new Date(timeEntry.clock_in_time), 'HH:mm') : ''
  );
  const [adjustedClockOut, setAdjustedClockOut] = useState(
    timeEntry?.clock_out_time ? format(new Date(timeEntry.clock_out_time), 'HH:mm') : ''
  );
  const [adjustedBreakMinutes, setAdjustedBreakMinutes] = useState(
    timeEntry?.total_break_minutes || 0
  );
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Du måste ange en motivering för ändringen');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create new timestamps with adjusted times
      const entryDate = new Date(timeEntry.date);
      const [inHour, inMinute] = adjustedClockIn.split(':');
      const [outHour, outMinute] = adjustedClockOut.split(':');
      
      const newClockIn = new Date(entryDate);
      newClockIn.setHours(parseInt(inHour), parseInt(inMinute), 0, 0);
      
      const newClockOut = new Date(entryDate);
      newClockOut.setHours(parseInt(outHour), parseInt(outMinute), 0, 0);
      
      // If clock out is before clock in, it's the next day
      if (newClockOut < newClockIn) {
        newClockOut.setDate(newClockOut.getDate() + 1);
      }

      // Calculate total hours
      const totalHours = (newClockOut - newClockIn) / (1000 * 60 * 60) - (adjustedBreakMinutes / 60);

      const adjustmentData = {
        original_data: {
          clock_in_time: timeEntry.clock_in_time,
          clock_out_time: timeEntry.clock_out_time,
          total_break_minutes: timeEntry.total_break_minutes,
          total_hours: timeEntry.total_hours
        },
        requested_data: {
          clock_in_time: newClockIn.toISOString(),
          clock_out_time: newClockOut.toISOString(),
          total_break_minutes: adjustedBreakMinutes,
          total_hours: Number(totalHours.toFixed(2))
        },
        reason: reason.trim()
      };

      await onSubmit(adjustmentData);
      onClose();
    } catch (error) {
      console.error('Error submitting adjustment:', error);
      alert('Kunde inte skicka in ändringen: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!timeEntry) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Rapportera avvikelse
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-slate-900 mb-1">
              {format(new Date(timeEntry.date), 'EEEE d MMMM yyyy', { locale: sv })}
            </p>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4" />
              <span>
                Nuvarande: {format(new Date(timeEntry.clock_in_time), 'HH:mm')} - 
                {timeEntry.clock_out_time ? format(new Date(timeEntry.clock_out_time), 'HH:mm') : 'Pågår'}
              </span>
            </div>
            {timeEntry.clock_in_location && (
              <div className="flex items-start gap-2 text-slate-600 mt-1">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-xs line-clamp-2">{timeEntry.clock_in_location.address}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="clockIn" className="text-sm font-medium">
                Instämpling
              </Label>
              <Input
                id="clockIn"
                type="time"
                value={adjustedClockIn}
                onChange={(e) => setAdjustedClockIn(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="clockOut" className="text-sm font-medium">
                Utst ämpling
              </Label>
              <Input
                id="clockOut"
                type="time"
                value={adjustedClockOut}
                onChange={(e) => setAdjustedClockOut(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="breakMinutes" className="text-sm font-medium">
              Rast (minuter)
            </Label>
            <Input
              id="breakMinutes"
              type="number"
              min="0"
              max="480"
              value={adjustedBreakMinutes}
              onChange={(e) => setAdjustedBreakMinutes(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="reason" className="text-sm font-medium">
              Motivering <span className="text-rose-600">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Förklara varför tiden behöver justeras..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="mt-1 min-h-[100px]"
            />
            <p className="text-xs text-slate-500 mt-1">
              Beskriv tydligt varför tiden behöver ändras
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? 'Skickar...' : 'Skicka till admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}