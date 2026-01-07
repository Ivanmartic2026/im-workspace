import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function TimeAdjustmentRequest({ userEmail, userName, timeEntries }) {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [adjustmentData, setAdjustmentData] = useState({
    clock_in_time: '',
    clock_out_time: '',
    reason: ''
  });
  const queryClient = useQueryClient();

  const createApprovalMutation = useMutation({
    mutationFn: (data) => base44.entities.ApprovalRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      setSelectedEntry(null);
      setAdjustmentData({ clock_in_time: '', clock_out_time: '', reason: '' });
    }
  });

  const completedEntries = timeEntries
    .filter(e => e.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const handleSelectEntry = (entry) => {
    setSelectedEntry(entry);
    const clockIn = new Date(entry.clock_in_time);
    const clockOut = entry.clock_out_time ? new Date(entry.clock_out_time) : new Date();
    
    setAdjustmentData({
      clock_in_time: format(clockIn, "yyyy-MM-dd'T'HH:mm"),
      clock_out_time: format(clockOut, "yyyy-MM-dd'T'HH:mm"),
      reason: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!adjustmentData.reason.trim()) {
      alert('Du måste ange en anledning till justeringen');
      return;
    }

    createApprovalMutation.mutate({
      type: 'time_adjustment',
      requester_email: userEmail,
      requester_name: userName,
      related_entity_id: selectedEntry.id,
      related_entity_type: 'TimeEntry',
      description: `Begär justering av tidrapport från ${format(new Date(selectedEntry.date), 'd MMM yyyy', { locale: sv })}`,
      reason: adjustmentData.reason,
      original_data: {
        clock_in_time: selectedEntry.clock_in_time,
        clock_out_time: selectedEntry.clock_out_time
      },
      requested_data: {
        clock_in_time: new Date(adjustmentData.clock_in_time).toISOString(),
        clock_out_time: new Date(adjustmentData.clock_out_time).toISOString()
      },
      status: 'pending'
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Om tidsjustering</p>
              <p className="text-xs text-blue-700">
                Begär ändringar av dina tider om du glömt stämpla eller stämplat fel. 
                Din chef behöver godkänna alla justeringar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedEntry ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Välj tid att justera</h3>
          {completedEntries.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-slate-500">Inga tidrapporter att justera</p>
              </CardContent>
            </Card>
          ) : (
            completedEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4" onClick={() => handleSelectEntry(entry)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">
                          {format(new Date(entry.date), 'd MMMM yyyy', { locale: sv })}
                        </p>
                        <p className="text-sm text-slate-600">
                          {format(new Date(entry.clock_in_time), 'HH:mm')} - {' '}
                          {entry.clock_out_time ? format(new Date(entry.clock_out_time), 'HH:mm') : 'Ingen utstämpling'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {entry.total_hours?.toFixed(1)}h • {entry.category}
                        </p>
                      </div>
                      <Edit className="h-5 w-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Justera tidrapport</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedEntry(null)}
                >
                  Avbryt
                </Button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {format(new Date(selectedEntry.date), 'd MMMM yyyy', { locale: sv })}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Original Times */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2">Nuvarande tider:</p>
                  <div className="flex items-center justify-between text-sm">
                    <span>In: {format(new Date(selectedEntry.clock_in_time), 'HH:mm')}</span>
                    <span>→</span>
                    <span>Ut: {selectedEntry.clock_out_time ? format(new Date(selectedEntry.clock_out_time), 'HH:mm') : 'Ingen'}</span>
                  </div>
                </div>

                {/* New Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ny instämpling</Label>
                    <Input
                      type="datetime-local"
                      value={adjustmentData.clock_in_time}
                      onChange={(e) => setAdjustmentData(prev => ({ ...prev, clock_in_time: e.target.value }))}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ny utstämpling</Label>
                    <Input
                      type="datetime-local"
                      value={adjustmentData.clock_out_time}
                      onChange={(e) => setAdjustmentData(prev => ({ ...prev, clock_out_time: e.target.value }))}
                      className="h-11"
                      required
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Anledning till justering *</Label>
                  <Textarea
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Förklara varför du behöver justera tiden..."
                    className="resize-none h-24"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Detta är obligatoriskt och kommer att ses av din chef
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={createApprovalMutation.isPending}
                  className="w-full h-11 rounded-xl"
                >
                  {createApprovalMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Skickar...
                    </>
                  ) : (
                    'Skicka för godkännande'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}