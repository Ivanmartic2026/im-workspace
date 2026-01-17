import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Plus, Trash2, Edit2, X, CheckCircle } from "lucide-react";
import { Circle, Popup, useMapEvents } from 'react-leaflet';

export default function GeofenceManager() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'kontor',
    latitude: 59.3293,
    longitude: 18.0686,
    radius_meters: 200,
    auto_classify_as: null,
    default_project_code: '',
    default_customer: '',
    address: '',
    notes: '',
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => base44.entities.Geofence.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Geofence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      handleCloseModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Geofence.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      handleCloseModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Geofence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    }
  });

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      type: 'kontor',
      latitude: 59.3293,
      longitude: 18.0686,
      radius_meters: 200,
      auto_classify_as: null,
      default_project_code: '',
      default_customer: '',
      address: '',
      notes: '',
      is_active: true
    });
    setEditingGeofence(null);
    setShowCreateModal(true);
  };

  const handleEdit = (geofence) => {
    setFormData(geofence);
    setEditingGeofence(geofence);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingGeofence(null);
    setSelectedPosition(null);
  };

  const handleSubmit = () => {
    if (editingGeofence) {
      updateMutation.mutate({ id: editingGeofence.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Är du säker på att du vill ta bort denna geofence?')) {
      deleteMutation.mutate(id);
    }
  };

  const typeColors = {
    kontor: 'bg-blue-100 text-blue-800',
    kundplats: 'bg-green-100 text-green-800',
    lager: 'bg-purple-100 text-purple-800',
    verkstad: 'bg-orange-100 text-orange-800',
    övrigt: 'bg-slate-100 text-slate-800'
  };

  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Geofences</CardTitle>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Skapa zon
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {geofences.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Inga geofences skapade</p>
              <p className="text-xs text-slate-400 mt-1">
                Skapa zoner för att spåra när fordon kommer eller går
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {geofences.map((geofence) => (
                <div
                  key={geofence.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{geofence.name}</p>
                        <Badge className={typeColors[geofence.type]}>
                          {geofence.type}
                        </Badge>
                        {!geofence.is_active && (
                          <Badge variant="outline" className="text-slate-500">Inaktiv</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {geofence.radius_meters}m radie
                        {geofence.auto_classify_as && ` • Auto: ${geofence.auto_classify_as}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(geofence)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(geofence.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGeofence ? 'Redigera geofence' : 'Skapa ny geofence'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Namn</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="t.ex. Huvudkontor"
              />
            </div>

            <div>
              <Label>Typ</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kontor">Kontor</SelectItem>
                  <SelectItem value="kundplats">Kundplats</SelectItem>
                  <SelectItem value="lager">Lager</SelectItem>
                  <SelectItem value="verkstad">Verkstad</SelectItem>
                  <SelectItem value="övrigt">Övrigt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Adress</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adress"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitud</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Longitud</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Radie (meter)</Label>
              <Input
                type="number"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label>Automatisk klassificering</Label>
              <Select 
                value={formData.auto_classify_as || 'none'} 
                onValueChange={(value) => setFormData({ ...formData, auto_classify_as: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen</SelectItem>
                  <SelectItem value="tjänst">Tjänst</SelectItem>
                  <SelectItem value="privat">Privat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.auto_classify_as === 'tjänst' && (
              <>
                <div>
                  <Label>Standard projektkod</Label>
                  <Input
                    value={formData.default_project_code}
                    onChange={(e) => setFormData({ ...formData, default_project_code: e.target.value })}
                    placeholder="Projektkod"
                  />
                </div>
                <div>
                  <Label>Standard kund</Label>
                  <Input
                    value={formData.default_customer}
                    onChange={(e) => setFormData({ ...formData, default_customer: e.target.value })}
                    placeholder="Kund"
                  />
                </div>
              </>
            )}

            <div>
              <Label>Anteckningar</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Valfri beskrivning"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Aktiv</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Avbryt
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {editingGeofence ? 'Uppdatera' : 'Skapa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Geofence overlay component for map
export function GeofenceOverlay({ geofences }) {
  if (!geofences || geofences.length === 0) return null;

  return (
    <>
      {geofences.filter(g => g.is_active).map((geofence) => (
        <Circle
          key={geofence.id}
          center={[geofence.latitude, geofence.longitude]}
          radius={geofence.radius_meters}
          pathOptions={{
            color: geofence.type === 'kontor' ? '#3b82f6' :
                   geofence.type === 'kundplats' ? '#10b981' :
                   geofence.type === 'lager' ? '#8b5cf6' :
                   geofence.type === 'verkstad' ? '#f97316' : '#64748b',
            fillColor: geofence.type === 'kontor' ? '#3b82f6' :
                       geofence.type === 'kundplats' ? '#10b981' :
                       geofence.type === 'lager' ? '#8b5cf6' :
                       geofence.type === 'verkstad' ? '#f97316' : '#64748b',
            fillOpacity: 0.15,
            weight: 2
          }}
        >
          <Popup>
            <div className="min-w-[150px]">
              <p className="font-semibold text-sm">{geofence.name}</p>
              <p className="text-xs text-slate-500 capitalize">{geofence.type}</p>
              {geofence.address && (
                <p className="text-xs text-slate-600 mt-1">{geofence.address}</p>
              )}
              {geofence.auto_classify_as && (
                <p className="text-xs text-slate-600 mt-1">
                  Auto: {geofence.auto_classify_as}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">Radie: {geofence.radius_meters}m</p>
            </div>
          </Popup>
        </Circle>
      ))}
    </>
  );
}