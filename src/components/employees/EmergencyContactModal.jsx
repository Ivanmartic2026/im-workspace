import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function EmergencyContactModal({ open, onClose, employee }) {
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const updatedContacts = [...(employee.emergency_contacts || []), data];
      return base44.entities.Employee.update(employee.id, { emergency_contacts: updatedContacts });
    },
    onSuccess: () => {
      setFormData({ name: '', relationship: '', phone: '', email: '' });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lägg till nödkontakt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="T.ex. Anna Andersson"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relation *</Label>
            <Input
              id="relationship"
              value={formData.relationship}
              onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
              placeholder="T.ex. Make/maka, Förälder"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="070-123 45 67"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="anna@example.com"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Lägg till'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}