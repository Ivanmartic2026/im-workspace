import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';
import { Loader2, CalendarDays, User } from "lucide-react";
import { differenceInDays } from "date-fns";

export default function AdminLeaveModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_email: '',
    type: 'semester',
    start_date: '',
    end_date: '',
    hours_per_day: 8,
    reason: ''
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: open,
  });

  const days = formData.start_date && formData.end_date 
    ? differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await base44.auth.me();
      
      await base44.entities.LeaveRequest.create({
        ...formData,
        days,
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      });
      
      onSuccess();
      onClose();
      setFormData({
        employee_email: '',
        type: 'semester',
        start_date: '',
        end_date: '',
        hours_per_day: 8,
        reason: ''
      });
    } catch (error) {
      console.error('Error creating leave:', error);
      alert('Kunde inte registrera ledighet: ' + error.message);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Registrera ledighet
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Välj anställd</Label>
            <Select
              value={formData.employee_email}
              onValueChange={(value) => setFormData(prev => ({ ...prev, employee_email: value }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Välj anställd..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.user_email} value={emp.user_email}>
                    {emp.user_email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                <SelectItem value="flex">Flex</SelectItem>
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
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Totalt <span className="font-semibold">{days} {days === 1 ? 'dag' : 'dagar'}</span>
                {formData.hours_per_day && formData.hours_per_day !== 8 && (
                  <span className="ml-2">({formData.hours_per_day}h/dag = {days * formData.hours_per_day}h totalt)</span>
                )}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Anteckning (valfritt)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Lägg till en notering..."
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading || days <= 0 || !formData.employee_email} className="min-w-[100px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrera'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}