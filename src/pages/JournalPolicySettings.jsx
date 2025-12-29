import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2, Settings, MapPin, Plus, X } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from "framer-motion";

const WEEKDAYS = [
  { value: 1, label: 'Måndag' },
  { value: 2, label: 'Tisdag' },
  { value: 3, label: 'Onsdag' },
  { value: 4, label: 'Torsdag' },
  { value: 5, label: 'Fredag' },
  { value: 6, label: 'Lördag' },
  { value: 0, label: 'Söndag' }
];

export default function JournalPolicySettings() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['journalPolicies'],
    queryFn: () => base44.entities.JournalPolicy.list(),
  });

  const policy = policies[0];

  const [formData, setFormData] = useState({
    name: 'Standard Policy',
    work_hours_start: '08:00',
    work_hours_end: '17:00',
    work_days: [1, 2, 3, 4, 5],
    office_locations: [],
    auto_approve_threshold_km: 10,
    require_purpose_over_km: 50,
    auto_categorize_enabled: true
  });

  useEffect(() => {
    if (policy) {
      setFormData(policy);
    }
  }, [policy]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (policy) {
        return base44.entities.JournalPolicy.update(policy.id, data);
      } else {
        return base44.entities.JournalPolicy.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalPolicies'] });
      alert('Policy sparad!');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const toggleWorkDay = (day) => {
    const days = formData.work_days || [];
    if (days.includes(day)) {
      setFormData(prev => ({ ...prev, work_days: days.filter(d => d !== day) }));
    } else {
      setFormData(prev => ({ ...prev, work_days: [...days, day] }));
    }
  };

  const addOfficeLocation = () => {
    setFormData(prev => ({
      ...prev,
      office_locations: [
        ...(prev.office_locations || []),
        { name: '', latitude: 0, longitude: 0, radius_meters: 500 }
      ]
    }));
  };

  const updateOfficeLocation = (index, field, value) => {
    const locations = [...(formData.office_locations || [])];
    locations[index] = { ...locations[index], [field]: value };
    setFormData(prev => ({ ...prev, office_locations: locations }));
  };

  const removeOfficeLocation = (index) => {
    setFormData(prev => ({
      ...prev,
      office_locations: prev.office_locations.filter((_, i) => i !== index)
    }));
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">Endast administratörer har åtkomst</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('DrivingJournal')}>
                <Button variant="ghost" size="sm" className="-ml-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tillbaka
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Körjournalspolicy</h1>
                <p className="text-sm text-slate-500 mt-1">Automatiseringsregler</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Aktivering */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Automatisering</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automatisk kategorisering</Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kategorisera resor automatiskt baserat på tid och plats
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_categorize_enabled}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, auto_categorize_enabled: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Arbetstider */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Arbetstider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start</Label>
                    <Input
                      type="time"
                      value={formData.work_hours_start || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_hours_start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Slut</Label>
                    <Input
                      type="time"
                      value={formData.work_hours_end || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_hours_end: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Arbetsdagar</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map(day => (
                      <Badge
                        key={day.value}
                        variant={formData.work_days?.includes(day.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleWorkDay(day.value)}
                      >
                        {day.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kontorsplatser */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Kontorsplatser</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={addOfficeLocation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Lägg till
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(!formData.office_locations || formData.office_locations.length === 0) ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Inga kontorsplatser tillagda
                  </p>
                ) : (
                  formData.office_locations.map((loc, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeOfficeLocation(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Namn (t.ex. Huvudkontoret)"
                        value={loc.name}
                        onChange={(e) => updateOfficeLocation(idx, 'name', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="Latitud"
                          value={loc.latitude}
                          onChange={(e) => updateOfficeLocation(idx, 'latitude', Number(e.target.value))}
                        />
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="Longitud"
                          value={loc.longitude}
                          onChange={(e) => updateOfficeLocation(idx, 'longitude', Number(e.target.value))}
                        />
                      </div>
                      <Input
                        type="number"
                        placeholder="Radie (meter)"
                        value={loc.radius_meters}
                        onChange={(e) => updateOfficeLocation(idx, 'radius_meters', Number(e.target.value))}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Tröskelvärden */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Regler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Auto-godkänn resor kortare än (km)</Label>
                  <Input
                    type="number"
                    value={formData.auto_approve_threshold_km}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      auto_approve_threshold_km: Number(e.target.value) 
                    }))}
                  />
                </div>
                <div>
                  <Label>Kräv syfte för resor längre än (km)</Label>
                  <Input
                    type="number"
                    value={formData.require_purpose_over_km}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      require_purpose_over_km: Number(e.target.value) 
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Spara policy
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}