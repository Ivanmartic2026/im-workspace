import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const SERVICES = ['support_service', 'install', 'rental', 'interntid'];
const FEATURES = ['TimeTracking', 'Vehicles', 'GPS', 'DrivingJournal', 'Manuals', 'Chat', 'Reports'];

export default function EmployeeModal({ open, onClose, employee }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    user_email: '',
    full_name: '',
    phone: '',
    department: 'Support & Service',
    job_title: '',
    manager_email: '',
    start_date: '',
    location: '',
    bio: '',
    assigned_services: [],
    assigned_features: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  useEffect(() => {
    if (employee) {
      const user = users.find(u => u.email === employee.user_email);
      setFormData({
        user_email: employee.user_email || '',
        full_name: user?.full_name || employee.full_name || '',
        phone: employee.phone || '',
        department: employee.department || 'Övrigt',
        job_title: employee.job_title || '',
        manager_email: employee.manager_email || '',
        start_date: employee.start_date || '',
        location: employee.location || '',
        bio: employee.bio || '',
        assigned_services: employee.assigned_services || [],
        assigned_features: employee.assigned_features || [],
      });
    } else {
      setFormData({
        user_email: '',
        full_name: '',
        phone: '',
        department: 'Support & Service',
        job_title: '',
        manager_email: '',
        start_date: '',
        location: '',
        bio: '',
        assigned_services: [],
        assigned_features: [],
      });
    }
  }, [employee, open, users]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Update user name if changed (admin users can update other users)
      if (data.full_name && data.user_email) {
        const user = users.find(u => u.email === data.user_email);
        if (user && user.full_name !== data.full_name) {
          await base44.entities.User.update(user.id, {
            full_name: data.full_name
          });
        }
      }

      // Remove full_name from employee data
      const { full_name, ...employeeData } = data;

      if (employee && employee.id && !employee.id.startsWith('user-')) {
        return await base44.entities.Employee.update(employee.id, employeeData);
      } else {
        return await base44.entities.Employee.create(employeeData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (error) => {
      console.error('Sparfel:', error);
      alert('Kunde inte spara medarbetare: ' + error.message);
    }
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
          <DialogDescription>
            Fyll i medarbetarens uppgifter och välj vilka funktioner de ska ha tillgång till.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_email">Email *</Label>
            <Select
              value={formData.user_email}
              onValueChange={(value) => {
                const user = users.find(u => u.email === value);
                setFormData(prev => ({ 
                  ...prev, 
                  user_email: value,
                  full_name: user?.full_name || ''
                }));
              }}
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

          <div className="space-y-2">
            <Label htmlFor="full_name">Namn</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="För- och efternamn"
            />
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
                  <SelectItem value="Support & Service">Support & Service</SelectItem>
                  <SelectItem value="Installation">Installation</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Rental">Rental</SelectItem>
                  <SelectItem value="Warehouse & Production">Warehouse & Production</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
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

          <div className="space-y-2">
            <Label>Tilldelade tjänster</Label>
            <div className="space-y-2">
              {SERVICES.map(service => (
                <label key={service} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.assigned_services.includes(service)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          assigned_services: [...prev.assigned_services, service]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          assigned_services: prev.assigned_services.filter(s => s !== service)
                        }));
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-700">
                    {service === 'support_service' && 'Support & Service'}
                    {service === 'install' && 'Installation'}
                    {service === 'rental' && 'Uthyrning'}
                    {service === 'interntid' && 'Interntid'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Funktionsåtkomst</Label>
            <div className="space-y-2">
              {FEATURES.map(feature => (
                <label key={feature} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.assigned_features.includes(feature)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          assigned_features: [...prev.assigned_features, feature]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          assigned_features: prev.assigned_features.filter(f => f !== feature)
                        }));
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-slate-700">{feature}</span>
                </label>
              ))}
            </div>
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