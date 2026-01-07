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
  { id: 'annat', label: 'Annat', icon: '📝' }
];

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Väntar' },
  approved: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Godkänd' },
  rejected: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Nekad' }
};

export default function LeaveRequestForm({ userEmail, userName, employee }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'semester',
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
      setShowForm(false);
      setFormData({ type: 'semester', start_date: '', end_date: '', reason: '' });
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
    <div className="space-y-4">
      {/* Balance Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-white/70 mb-1">Semester kvar</p>
              <p className="text-2xl font-bold">{employee?.vacation_balance || 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">Använt i år</p>
              <p className="text-2xl font-bold">{employee?.vacation_used_this_year || 0}</p>
            </div>
            <div>
              <p className="text-xs text-white/70 mb-1">Sjukdagar</p>
              <p className="text-2xl font-bold">{employee?.sick_days_this_year || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Request Button */}
      {!showForm && (
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full h-12 rounded-2xl shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ny ansökan
        </Button>
      )}

      {/* Request Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Ny ledighetsansökan</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Typ av ledighet</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="h-11">
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
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Till datum</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="h-11"
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
                  <Label>Motivering (valfri)</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Beskriv anledningen till din ledighetsansökan..."
                    className="resize-none h-20"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="flex-1 h-11 rounded-xl"
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="flex-1 h-11 rounded-xl"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Skickar...
                      </>
                    ) : (
                      'Skicka ansökan'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Existing Requests */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Mina ansökningar</h3>
        {leaveRequests.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-slate-500">Inga ledighetsansökningar</p>
            </CardContent>
          </Card>
        ) : (
          leaveRequests.map((request, index) => {
            const status = statusConfig[request.status];
            const StatusIcon = status.icon;
            const leaveType = leaveTypes.find(t => t.id === request.type);

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{leaveType?.icon}</span>
                          <h4 className="font-semibold text-slate-900">{leaveType?.label}</h4>
                        </div>
                        <p className="text-sm text-slate-600">
                          {format(new Date(request.start_date), 'd MMM', { locale: sv })} - {format(new Date(request.end_date), 'd MMM yyyy', { locale: sv })}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {request.days} dag{request.days !== 1 ? 'ar' : ''}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bg}`}>
                        <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                      </div>
                    </div>

                    {request.reason && (
                      <p className="text-sm text-slate-600 mt-3 p-2 bg-slate-50 rounded">
                        {request.reason}
                      </p>
                    )}

                    {request.review_comment && (
                      <div className="mt-3 p-2 bg-slate-50 rounded text-sm">
                        <p className="text-xs text-slate-500 mb-1">Svar från chef:</p>
                        <p className="text-slate-700">{request.review_comment}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}