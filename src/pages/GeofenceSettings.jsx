import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Trash2, Save, MapPinned, ArrowLeft } from "lucide-react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function GeofenceSettings() {
  const [isCreating, setIsCreating] = useState(false);
  const [newGeofence, setNewGeofence] = useState({
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

  const { data: geofences = [], isLoading } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => base44.entities.Geofence.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Geofence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setIsCreating(false);
      setNewGeofence({
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Geofence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
  });

  const handleMapClick = (latlng) => {
    setNewGeofence(prev => ({
      ...prev,
      latitude: latlng.lat,
      longitude: latlng.lng
    }));
  };

  const handleCreate = () => {
    const data = { ...newGeofence };
    if (!data.auto_classify_as) delete data.auto_classify_as;
    if (!data.default_project_code) delete data.default_project_code;
    if (!data.default_customer) delete data.default_customer;
    if (!data.address) delete data.address;
    if (!data.notes) delete data.notes;
    
    createMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to={createPageUrl('Admin')}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Geofencing</h1>
              <p className="text-sm text-slate-500 mt-1">
                Definiera platser för automatisk klassificering av resor
              </p>
            </div>
            <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Ny plats
            </Button>
          </div>

          {/* Create Form */}
          {isCreating && (
            <Card className="border-0 shadow-sm mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Skapa ny geofence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Map */}
                <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
                  <MapContainer
                    center={[newGeofence.latitude, newGeofence.longitude]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <MapClickHandler onLocationSelect={handleMapClick} />
                    <Marker position={[newGeofence.latitude, newGeofence.longitude]} />
                    <Circle
                      center={[newGeofence.latitude, newGeofence.longitude]}
                      radius={newGeofence.radius_meters}
                      pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                    />
                  </MapContainer>
                </div>
                <p className="text-xs text-slate-500">Klicka på kartan för att välja plats</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Namn</Label>
                    <Input
                      value={newGeofence.name}
                      onChange={(e) => setNewGeofence({ ...newGeofence, name: e.target.value })}
                      placeholder="t.ex. Huvudkontoret"
                    />
                  </div>
                  <div>
                    <Label>Typ</Label>
                    <Select value={newGeofence.type} onValueChange={(v) => setNewGeofence({ ...newGeofence, type: v })}>
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
                </div>

                <div>
                  <Label>Radie (meter)</Label>
                  <Input
                    type="number"
                    value={newGeofence.radius_meters}
                    onChange={(e) => setNewGeofence({ ...newGeofence, radius_meters: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Automatisk klassificering</Label>
                  <Select 
                    value={newGeofence.auto_classify_as || 'none'} 
                    onValueChange={(v) => setNewGeofence({ ...newGeofence, auto_classify_as: v === 'none' ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen</SelectItem>
                      <SelectItem value="tjänst">Tjänsteresa</SelectItem>
                      <SelectItem value="privat">Privat resa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newGeofence.auto_classify_as === 'tjänst' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Standard projektkod</Label>
                      <Input
                        value={newGeofence.default_project_code}
                        onChange={(e) => setNewGeofence({ ...newGeofence, default_project_code: e.target.value })}
                        placeholder="P-123"
                      />
                    </div>
                    <div>
                      <Label>Standard kund</Label>
                      <Input
                        value={newGeofence.default_customer}
                        onChange={(e) => setNewGeofence({ ...newGeofence, default_customer: e.target.value })}
                        placeholder="Kundnamn"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Adress</Label>
                  <Input
                    value={newGeofence.address}
                    onChange={(e) => setNewGeofence({ ...newGeofence, address: e.target.value })}
                    placeholder="Gatuadress"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreate} disabled={!newGeofence.name || createMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Spara
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Avbryt
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* List */}
          <div className="space-y-3">
            {geofences.map(geo => (
              <Card key={geo.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPinned className="h-5 w-5 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">{geo.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                          {geo.type}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <div>
                          <span className="text-slate-500">Radie:</span> {geo.radius_meters}m
                        </div>
                        {geo.auto_classify_as && (
                          <div>
                            <span className="text-slate-500">Auto:</span> {geo.auto_classify_as}
                          </div>
                        )}
                        {geo.default_project_code && (
                          <div>
                            <span className="text-slate-500">Projekt:</span> {geo.default_project_code}
                          </div>
                        )}
                        {geo.address && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Adress:</span> {geo.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(geo.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {geofences.length === 0 && !isCreating && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Inga platser definierade ännu</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Skapa geofences för att automatiskt klassificera resor
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}