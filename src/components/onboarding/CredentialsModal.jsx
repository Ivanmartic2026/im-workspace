import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function CredentialsModal({ open, onClose, employee }) {
  const [formData, setFormData] = useState({
    system_name: '',
    username: '',
    password: '',
    url: '',
    notes: ''
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const newCredential = {
        ...data,
        created_date: new Date().toISOString()
      };
      const updatedCredentials = [...(employee.credentials || []), newCredential];
      return base44.entities.Employee.update(employee.id, { credentials: updatedCredentials });
    },
    onSuccess: () => {
      setFormData({ system_name: '', username: '', password: '', url: '', notes: '' });
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
          <DialogTitle>Lägg till inloggningsuppgifter</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system_name">System/Tjänst *</Label>
            <Input
              id="system_name"
              value={formData.system_name}
              onChange={(e) => setFormData(prev => ({ ...prev, system_name: e.target.value }))}
              placeholder="T.ex. Office 365, Slack"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Användarnamn *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="användarnamn"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Lösenord *</Label>
            <Input
              id="password"
              type="text"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="lösenord"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Eventuella extra instruktioner..."
              className="min-h-[60px]"
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