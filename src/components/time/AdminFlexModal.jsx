import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';
import { Loader2, Zap } from "lucide-react";

export default function AdminFlexModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_email: '',
    hours: 0,
    reason: '',
    type: 'add' // 'add' eller 'subtract'
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: open,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await base44.auth.me();
      
      // Hämta den anställda
      const emp = employees.find(e => e.user_email === formData.employee_email);
      if (!emp) throw new Error('Anställd hittades inte');
      
      // Beräkna nya flex-saldot
      const hoursChange = formData.type === 'add' ? formData.hours : -formData.hours;
      const newFlexBalance = (emp.flex_balance || 0) + hoursChange;
      
      // Uppdatera anställds flex-saldo
      await base44.entities.Employee.update(emp.id, {
        flex_balance: newFlexBalance
      });
      
      // Skapa en ApprovalRequest för dokumentation
      await base44.entities.ApprovalRequest.create({
        type: 'flex_adjustment',
        requester_email: formData.employee_email,
        requester_name: emp.user_email,
        description: `Flex-justering: ${formData.type === 'add' ? '+' : '-'}${Math.abs(formData.hours)}h`,
        reason: formData.reason,
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        original_data: { flex_balance: emp.flex_balance },
        requested_data: { flex_balance: newFlexBalance }
      });
      
      onSuccess();
      onClose();
      setFormData({
        employee_email: '',
        hours: 0,
        reason: '',
        type: 'add'
      });
    } catch (error) {
      console.error('Error registering flex:', error);
      alert('Kunde inte registrera flextid: ' + error.message);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Registrera flextid
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
            <Label>Typ av justering</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Lägg till flextid</SelectItem>
                <SelectItem value="subtract">Dra bort flextid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Antal timmar</Label>
            <Input
              id="hours"
              type="number"
              value={formData.hours}
              onChange={(e) => setFormData(prev => ({ ...prev, hours: Number(e.target.value) }))}
              className="h-11"
              min="0.5"
              step="0.5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Anledning (valfritt)</Label>
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
            <Button type="submit" disabled={loading || !formData.employee_email || formData.hours === 0} className="min-w-[100px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrera'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}