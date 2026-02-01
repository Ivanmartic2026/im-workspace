import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, Mail, Lock, Briefcase, Users } from "lucide-react";

const AVAILABLE_FEATURES = [
  { id: 'TimeTracking', label: 'Tidrapportering', icon: '⏱️' },
  { id: 'Vehicles', label: 'Fordon', icon: '🚗' },
  { id: 'GPS', label: 'GPS-spårning', icon: '📍' },
  { id: 'DrivingJournal', label: 'Körjournal', icon: '📝' },
  { id: 'Manuals', label: 'Manualer', icon: '📚' },
  { id: 'Chat', label: 'Chat', icon: '💬' },
  { id: 'Reports', label: 'Rapporter', icon: '📊' },
];

const DEPARTMENTS = [
  'Administration',
  'Teknik',
  'Försäljning',
  'Produktion',
  'Lager',
  'Transport',
  'Övrigt'
];

export default function CreateUserModal({ onClose }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    department: '',
    job_title: '',
    phone: '',
    selectedFeatures: []
  });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Skapa användare
      const newUser = await base44.entities.User.create({
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        password: formData.password // I produktion hashas detta på servern
      });

      // Skapa anställd-profil kopplad till användaren
      await base44.entities.Employee.create({
        user_email: formData.email,
        first_name: formData.full_name.split(' ')[0] || '',
        last_name: formData.full_name.split(' ').slice(1).join(' ') || '',
        department: formData.department,
        job_title: formData.job_title,
        phone: formData.phone,
        status: 'active',
        assigned_features: formData.selectedFeatures,
        start_date: new Date().toISOString().split('T')[0]
      });

      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (err) => {
      setError(err.message || 'Kunde inte skapa användaren');
    }
  });

  const toggleFeature = (featureId) => {
    setFormData(prev => ({
      ...prev,
      selectedFeatures: prev.selectedFeatures.includes(featureId)
        ? prev.selectedFeatures.filter(f => f !== featureId)
        : [...prev.selectedFeatures, featureId]
    }));
  };

  const selectAllFeatures = () => {
    setFormData(prev => ({
      ...prev,
      selectedFeatures: AVAILABLE_FEATURES.map(f => f.id)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.full_name) {
      setError('Fyll i alla obligatoriska fält');
      return;
    }

    if (formData.password.length < 4) {
      setError('Lösenordet måste vara minst 4 tecken');
      return;
    }

    createMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Skapa ny användare
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Grundläggande information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Inloggningsuppgifter
            </h3>

            <div className="space-y-3">
              <div>
                <Label htmlFor="full_name">Namn *</Label>
                <Input
                  id="full_name"
                  placeholder="Anna Andersson"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">E-post *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="anna@foretag.se"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Lösenord *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minst 4 tecken"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Roll och avdelning */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Roll och avdelning
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Roll</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Användare</SelectItem>
                    <SelectItem value="manager">Chef</SelectItem>
                    <SelectItem value="admin">Administratör</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Avdelning</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="job_title">Befattning</Label>
                <Input
                  id="job_title"
                  placeholder="t.ex. Tekniker"
                  value={formData.job_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  placeholder="070-123 45 67"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Behörigheter */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Behörigheter
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={selectAllFeatures}>
                Välj alla
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FEATURES.map(feature => (
                <div
                  key={feature.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Checkbox
                    id={`feature-${feature.id}`}
                    checked={formData.selectedFeatures.includes(feature.id)}
                    onCheckedChange={() => toggleFeature(feature.id)}
                  />
                  <Label htmlFor={`feature-${feature.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                    <span>{feature.icon}</span>
                    <span>{feature.label}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Skapar...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Skapa användare
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
