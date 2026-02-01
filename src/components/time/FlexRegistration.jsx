import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";

export default function FlexRegistration({ userEmail, userName, employee, onClose }) {
  const [registrationType, setRegistrationType] = useState('dag'); // 'dag' eller 'timmar'
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState('');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const createFlexMutation = useMutation({
    mutationFn: async (flexData) => {
      const currentFlex = employee?.flex_balance || 0;
      const newFlex = currentFlex + flexData.totalHours;

      // Update employee flex balance
      const employees = await base44.entities.Employee.filter({ user_email: userEmail });
      if (employees.length > 0) {
        await base44.entities.Employee.update(employees[0].id, {
          flex_balance: newFlex
        });
      }

      // Create time entry record for tracking
      return base44.entities.TimeEntry.create({
        employee_email: userEmail,
        date: flexData.startDate,
        clock_in_time: new Date(flexData.startDate).toISOString(),
        clock_out_time: new Date(flexData.startDate).toISOString(),
        total_hours: flexData.totalHours,
        category: 'interntid',
        notes: `Flex: ${flexData.reason}`,
        status: 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success('Flex registrerad');
      setReason('');
      setHours('');
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error('Kunde inte registrera flex');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    let totalHours = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (registrationType === 'dag') {
      // Calculate days between start and end
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      totalHours = days * (employee?.normal_work_hours_per_day || 8);
    } else {
      totalHours = parseFloat(hours);
    }

    if (!totalHours || totalHours <= 0) {
      toast.error('Ange antal timmar eller dagar');
      return;
    }

    if (!reason.trim()) {
      toast.error('Ange anledning');
      return;
    }

    createFlexMutation.mutate({
      startDate,
      endDate,
      totalHours,
      reason
    });
  };

  const calculateDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Typ av registrering</Label>
            <Select value={registrationType} onValueChange={setRegistrationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dag">Dag/dagar</SelectItem>
                <SelectItem value="timmar">Timmar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {registrationType === 'dag' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Slutdatum</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Antal timmar</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="T.ex. 8 eller 4.5"
                required
              />
            </div>
          )}

          {registrationType === 'dag' && startDate && endDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>{calculateDays()}</strong> {calculateDays() === 1 ? 'dag' : 'dagar'} = 
                <strong> {calculateDays() * (employee?.normal_work_hours_per_day || 8)}</strong> timmar
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Anledning</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Beskriv anledningen..."
              rows={3}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={createFlexMutation.isPending}
          >
            {createFlexMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrerar...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Registrera flex
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}