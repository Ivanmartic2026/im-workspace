import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Clock, Coffee, AlertTriangle, Loader2, Edit2, Save, X } from "lucide-react";
import { format } from "date-fns";

export default function EmployeePresenceDetailModal({ open, onClose, employee, timeEntry }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    clock_in_time: '',
    clock_out_time: '',
    edit_reason: ''
  });

  React.useEffect(() => {
    if (timeEntry && open) {
      setEditData({
        clock_in_time: timeEntry.clock_in_time ? format(new Date(timeEntry.clock_in_time), "yyyy-MM-dd'T'HH:mm") : '',
        clock_out_time: timeEntry.clock_out_time ? format(new Date(timeEntry.clock_out_time), "yyyy-MM-dd'T'HH:mm") : '',
        edit_reason: ''
      });
    }
  }, [timeEntry, open]);

  const updateTimeMutation = useMutation({
    mutationFn: async (data) => {
      if (!timeEntry?.id) return;
      return await base44.entities.TimeEntry.update(timeEntry.id, {
        clock_in_time: data.clock_in_time,
        clock_out_time: data.clock_out_time || null,
        edit_reason: data.edit_reason,
        edited_by: (await base44.auth.me()).email,
        edited_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntriesToday'] });
      setIsEditing(false);
      onClose();
    }
  });

  const manualClockOutMutation = useMutation({
    mutationFn: async () => {
      if (!timeEntry?.id) return;
      const now = new Date().toISOString();
      return await base44.entities.TimeEntry.update(timeEntry.id, {
        clock_out_time: now,
        edit_reason: 'Manuell utstämpling av admin',
        edited_by: (await base44.auth.me()).email,
        edited_at: now
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntriesToday'] });
      onClose();
    }
  });

  if (!employee || !timeEntry) return null;

  const totalBreakMinutes = timeEntry.breaks?.reduce((sum, br) => sum + (br.duration_minutes || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{employee.full_name} - Dagsstatus</span>
            {!isEditing && timeEntry.clock_in_time && !timeEntry.clock_out_time && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => manualClockOutMutation.mutate()}
                disabled={manualClockOutMutation.isPending}
              >
                {manualClockOutMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Stämplar ut...</>
                ) : (
                  <>Stämpla ut nu</>
                )}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Information</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-600">Avdelning:</span> <span className="font-medium">{employee.department}</span></p>
              <p><span className="text-slate-600">Email:</span> <span className="font-medium">{employee.email}</span></p>
              <p><span className="text-slate-600">Total tid idag:</span> <span className="font-medium">{employee.totalHours?.toFixed(2) || 0} timmar</span></p>
            </div>
          </div>

          {/* Time Details */}
          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Tidsregistrering</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Redigera
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Instämpling</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {timeEntry.clock_in_time ? format(new Date(timeEntry.clock_in_time), 'HH:mm') : '-'}
                  </p>
                  {timeEntry.clock_in_location && (
                    <p className="text-xs text-slate-600 mt-2 flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{timeEntry.clock_in_location.address || `${timeEntry.clock_in_location.latitude?.toFixed(4)}, ${timeEntry.clock_in_location.longitude?.toFixed(4)}`}</span>
                    </p>
                  )}
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Utstämpling</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {timeEntry.clock_out_time ? format(new Date(timeEntry.clock_out_time), 'HH:mm') : '-'}
                  </p>
                  {timeEntry.clock_out_location && (
                    <p className="text-xs text-slate-600 mt-2 flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{timeEntry.clock_out_location.address || `${timeEntry.clock_out_location.latitude?.toFixed(4)}, ${timeEntry.clock_out_location.longitude?.toFixed(4)}`}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Redigera tider</h3>
              
              <div className="space-y-2">
                <Label>Instämplingstid</Label>
                <Input
                  type="datetime-local"
                  value={editData.clock_in_time}
                  onChange={(e) => setEditData(prev => ({ ...prev, clock_in_time: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Utstämplingstid (lämna tom om fortfarande instämplad)</Label>
                <Input
                  type="datetime-local"
                  value={editData.clock_out_time}
                  onChange={(e) => setEditData(prev => ({ ...prev, clock_out_time: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Orsak till ändring *</Label>
                <Textarea
                  placeholder="Beskriv varför tiden justeras..."
                  value={editData.edit_reason}
                  onChange={(e) => setEditData(prev => ({ ...prev, edit_reason: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Avbryt
                </Button>
                <Button
                  onClick={() => updateTimeMutation.mutate(editData)}
                  disabled={updateTimeMutation.isPending || !editData.edit_reason}
                  className="flex-1"
                >
                  {updateTimeMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sparar...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Spara ändringar</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Breaks */}
          {timeEntry.breaks && timeEntry.breaks.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                Pauser ({totalBreakMinutes} minuter)
              </h3>
              <div className="space-y-2">
                {timeEntry.breaks.map((breakItem, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{breakItem.type}</span>
                      <span className="text-slate-600">{breakItem.duration_minutes} min</span>
                    </div>
                    {breakItem.start_time && (
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(breakItem.start_time), 'HH:mm')} - {breakItem.end_time ? format(new Date(breakItem.end_time), 'HH:mm') : 'Pågår'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {timeEntry.notes && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Anteckningar</h3>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{timeEntry.notes}</p>
            </div>
          )}

          {/* Edit History */}
          {timeEntry.edited_by && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">Redigerad</p>
                  <p className="text-amber-700">
                    Redigerad av {timeEntry.edited_by} {timeEntry.edited_at && `den ${format(new Date(timeEntry.edited_at), 'yyyy-MM-dd HH:mm')}`}
                  </p>
                  {timeEntry.edit_reason && (
                    <p className="text-amber-600 mt-1">Orsak: {timeEntry.edit_reason}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}