import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function EmployeeModal({ open, onClose, employee }) {
  const [formData, setFormData] = useState({
    user_email: '',
    phone: '',
    department: 'Övrigt',
    job_title: '',
    manager_email: '',
    start_date: '',
    location: '',
    bio: '',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        user_email: employee.user_email || '',
        phone: employee.phone || '',
        department: employee.department || 'Övrigt',
        job_title: employee.job_title || '',
        manager_email: employee.manager_email || '',
        start_date: employee.start_date || '',
        location: employee.location || '',
        bio: employee.bio || '',
      });
    } else {
      setFormData({
        user_email: '',
        phone: '',
        department: 'Övrigt',
        job_title: '',
        manager_email: '',
        start_date: '',
        location: '',
        bio: '',
      });
    }
  }, [employee, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (employee) {
        return await base44.entities.Employee.update(employee.id, data);
      } else {
        return await base44.entities.Employee.create(data);
      }
    },
    onSuccess: () => {
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? 'Redigera medarbetare' : 'Lägg till medarbetare'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_email">Email *</Label>
            <Select
              value={formData.user_email}
              onValueChange={(value) => setFormData(prev => ({ ...prev, user_email: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj användare" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job_title">Titel</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                placeholder="Titel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Avdelning</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ledning">Ledning</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Sälj">Sälj</SelectItem>
                  <SelectItem value="Marknad">Marknad</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Ekonomi">Ekonomi</SelectItem>
                  <SelectItem value="Produktion">Produktion</SelectItem>
                  <SelectItem value="Kundtjänst">Kundtjänst</SelectItem>
                  <SelectItem value="Övrigt">Övrigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="070-123 45 67"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Startdatum</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Kontor</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Stockholm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="En kort beskrivning..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || !formData.user_email}
              className="flex-1"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Spara'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}