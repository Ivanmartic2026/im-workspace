import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Loader2, CheckCircle, Clock, XCircle, Plus } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const leaveTypes = [
  { id: 'semester', label: 'Semester', icon: '🏖️' },
  { id: 'vab', label: 'VAB', icon: '👶' },
  { id: 'sjuk', label: 'Sjukfrånvaro', icon: '🤒' },
  { id: 'tjänstledigt', label: 'Tjänstledighet', icon: '📋' },
  { id: 'föräldraledigt', label: 'Föräldraledighet', icon: '👨‍👩‍👧' },
  { id: 'flex', label: 'Flex', icon: '⏰' },
  { id: 'annat', label: 'Annat', icon: '📝' }
];

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Väntar' },
  approved: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Godkänd' },
  rejected: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Nekad' }
};

export default function LeaveRequestForm({ userEmail, userName, employee, defaultType, onClose }) {
  const [formData, setFormData] = useState({
    type: defaultType || 'semester',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const queryClient = useQueryClient();

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leaveRequests', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const all = await base44.entities.LeaveRequest.list('-created_date', 50);
      return all.filter(r => r.employee_email === userEmail);
    },
    enabled: !!userEmail
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      setFormData({ type: defaultType || 'semester', start_date: '', end_date: '', reason: '' });
      if (onClose) onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;
    
    createMutation.mutate({
      employee_email: userEmail,
      type: formData.type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      days,
      reason: formData.reason,
      status: 'pending'
    });
  };

  const calculatedDays = formData.start_date && formData.end_date 
    ? differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1
    : 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Typ av ledighet</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Från datum</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Till datum</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                min={formData.start_date}
                required
              />
            </div>
          </div>

          {calculatedDays > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <Calendar className="h-4 w-4 inline mr-2 text-slate-500" />
              <span className="font-medium">{calculatedDays} dag{calculatedDays !== 1 ? 'ar' : ''}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Anledning</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Beskriv anledningen..."
              rows={3}
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Skicka ansökan
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}