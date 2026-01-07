import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function WorkPolicyConfig() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    normal_work_hours_per_day: 8,
    normal_work_hours_per_week: 40,
    required_break_minutes: 30,
    break_after_hours: 5,
    max_work_hours_per_day: 12,
    overtime_threshold_daily: 8,
    qualified_overtime_after_hours: 10,
    overtime_compensation_rate: 1.5,
    qualified_overtime_rate: 2.0,
    vacation_days_per_year: 25,
    flex_time_enabled: true,
    max_flex_balance: 40,
    gps_verification_required: false
  });
  const queryClient = useQueryClient();

  const { data: policies = [] } = useQuery({
    queryKey: ['workPolicies'],
    queryFn: () => base44.entities.WorkPolicy.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkPolicy.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workPolicies'] });
      setShowForm(false);
      setFormData({
        name: '',
        normal_work_hours_per_day: 8,
        normal_work_hours_per_week: 40,
        required_break_minutes: 30,
        break_after_hours: 5,
        max_work_hours_per_day: 12,
        overtime_threshold_daily: 8,
        qualified_overtime_after_hours: 10,
        overtime_compensation_rate: 1.5,
        qualified_overtime_rate: 2.0,
        vacation_days_per_year: 25,
        flex_time_enabled: true,
        max_flex_balance: 40,
        gps_verification_required: false
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      is_active: true
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Settings className="h-8 w-8" />
            <div>
              <h3 className="font-semibold mb-1">Arbetspolicys</h3>
              <p className="text-sm text-white/70">
                Definiera regler för arbetstid, övertid och ledighet
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full h-12">
          <Plus className="w-4 h-4 mr-2" />
          Skapa ny policy
        </Button>
      )}

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Ny arbetspolicy</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Namn på policy</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Standard arbetstid"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Arbetstid</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Timmar per dag</Label>
                      <Input
                        type="number"
                        value={formData.normal_work_hours_per_day}
                        onChange={(e) => setFormData(prev => ({ ...prev, normal_work_hours_per_day: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Timmar per vecka</Label>
                      <Input
                        type="number"
                        value={formData.normal_work_hours_per_week}
                        onChange={(e) => setFormData(prev => ({ ...prev, normal_work_hours_per_week: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Raster</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Obligatorisk rast (min)</Label>
                      <Input
                        type="number"
                        value={formData.required_break_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, required_break_minutes: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rast efter (timmar)</Label>
                      <Input
                        type="number"
                        value={formData.break_after_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, break_after_hours: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Övertid</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Övertid efter (h/dag)</Label>
                      <Input
                        type="number"
                        value={formData.overtime_threshold_daily}
                        onChange={(e) => setFormData(prev => ({ ...prev, overtime_threshold_daily: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kvalificerad efter (h)</Label>
                      <Input
                        type="number"
                        value={formData.qualified_overtime_after_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, qualified_overtime_after_hours: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Enkel övertid (faktor)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.overtime_compensation_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, overtime_compensation_rate: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kvalificerad övertid (faktor)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.qualified_overtime_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, qualified_overtime_rate: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Semester & Flex</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Semesterdagar per år</Label>
                      <Input
                        type="number"
                        value={formData.vacation_days_per_year}
                        onChange={(e) => setFormData(prev => ({ ...prev, vacation_days_per_year: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max flexsaldo (h)</Label>
                      <Input
                        type="number"
                        value={formData.max_flex_balance}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_flex_balance: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <Label>Aktivera flextid</Label>
                    <Switch
                      checked={formData.flex_time_enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, flex_time_enabled: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Säkerhet</h4>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <Label>Kräv GPS-verifiering</Label>
                    <Switch
                      checked={formData.gps_verification_required}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, gps_verification_required: checked }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="flex-1"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sparar...
                      </>
                    ) : (
                      'Spara policy'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Befintliga policys</h3>
        {policies.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-slate-500">Inga policys skapade</p>
            </CardContent>
          </Card>
        ) : (
          policies.map((policy, index) => (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{policy.name}</h4>
                    {policy.is_active && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                        Aktiv
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                    <div>
                      <p>Arbetstid: {policy.normal_work_hours_per_day}h/dag</p>
                    </div>
                    <div>
                      <p>Övertid: {policy.overtime_threshold_daily}h+</p>
                    </div>
                    <div>
                      <p>Semester: {policy.vacation_days_per_year} dagar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}