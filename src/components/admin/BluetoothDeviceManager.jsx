import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Bluetooth, Smartphone, Radio, RefreshCw, Power, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function BluetoothDeviceManager() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    device_type: 'mobile',
    mac_address: '',
    driver_email: '',
    driver_name: '',
    driver_code: '',
    clock_in_enabled: false,
    power_cutoff_enabled: false,
    notes: ''
  });
  const queryClient = useQueryClient();

  const { data: devices = [] } = useQuery({
    queryKey: ['bluetooth-devices'],
    queryFn: () => base44.entities.BluetoothDevice.list('-created_date')
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const device = await base44.entities.BluetoothDevice.create(data);
      
      // Skicka auktoriseringskommando till GPS
      const vehicle = vehicles.find(v => v.id === data.vehicle_id);
      await base44.functions.invoke('bluetoothGPS', {
        action: 'authorizeDevice',
        params: {
          vehicleId: data.vehicle_id,
          bluetoothDeviceId: device.id,
          macAddress: data.mac_address,
          driverName: data.driver_name,
          driverCode: data.driver_code,
          deviceType: data.device_type
        }
      });

      return device;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bluetooth-devices']);
      setShowModal(false);
      resetForm();
      toast.success('Bluetooth-enhet tillagd och auktoriserad');
    },
    onError: (error) => {
      toast.error('Kunde inte lägga till enhet: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BluetoothDevice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['bluetooth-devices']);
      toast.success('Bluetooth-enhet borttagen');
    }
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ deviceId, feature, enabled }) => {
      const device = devices.find(d => d.id === deviceId);
      
      // Skicka kommando till GPS
      await base44.functions.invoke('bluetoothGPS', {
        action: feature === 'clock_in' ? 'enableClockIn' : 'enablePowerCutoff',
        params: {
          vehicleId: device.vehicle_id,
          enabled
        }
      });

      // Uppdatera lokalt
      await base44.entities.BluetoothDevice.update(deviceId, {
        [feature === 'clock_in' ? 'clock_in_enabled' : 'power_cutoff_enabled']: enabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bluetooth-devices']);
      toast.success('Inställning uppdaterad');
    },
    onError: (error) => {
      toast.error('Fel: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      device_type: 'mobile',
      mac_address: '',
      driver_email: '',
      driver_name: '',
      driver_code: '',
      clock_in_enabled: false,
      power_cutoff_enabled: false,
      notes: ''
    });
  };

  const handleEmployeeSelect = (email) => {
    const employee = employees.find(e => e.user_email === email);
    setFormData({
      ...formData,
      driver_email: email,
      driver_name: employee?.user_email || email
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
    createMutation.mutate({
      ...formData,
      registration_number: vehicle?.registration_number
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bluetooth-enheter</h2>
          <p className="text-slate-600 text-sm">Hantera Bluetooth-anslutna enheter för fordon</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-slate-900">
          <Plus className="h-4 w-4 mr-2" />
          Lägg till enhet
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device) => {
          const vehicle = vehicles.find(v => v.id === device.vehicle_id);
          
          return (
            <Card key={device.id} className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      device.device_type === 'beacon' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {device.device_type === 'beacon' ? (
                        <Radio className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Smartphone className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{device.driver_name}</CardTitle>
                      <p className="text-xs text-slate-500">{vehicle?.registration_number}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(device.id)}
                    className="text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">MAC-adress</span>
                    <span className="font-mono text-xs">{device.mac_address}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Förarkod</span>
                    <span className="font-mono text-xs">{device.driver_code}</span>
                  </div>
                  {device.last_synced && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Senast synkad</span>
                      <span className="text-xs">{format(new Date(device.last_synced), 'PPp', { locale: sv })}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700">Automatisk in-/utcheckning</span>
                    </div>
                    <Switch
                      checked={device.clock_in_enabled}
                      onCheckedChange={(checked) => 
                        toggleFeatureMutation.mutate({ 
                          deviceId: device.id, 
                          feature: 'clock_in', 
                          enabled: checked 
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Power className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700">Fjärrstyrning ström/bränsle</span>
                    </div>
                    <Switch
                      checked={device.power_cutoff_enabled}
                      onCheckedChange={(checked) => 
                        toggleFeatureMutation.mutate({ 
                          deviceId: device.id, 
                          feature: 'power_cutoff', 
                          enabled: checked 
                        })
                      }
                    />
                  </div>
                </div>

                {device.notes && (
                  <p className="text-xs text-slate-500 pt-2 border-t">{device.notes}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {devices.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Bluetooth className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga Bluetooth-enheter</h3>
            <p className="text-slate-600 mb-4">Lägg till en Bluetooth-enhet för automatisk föraridentifiering</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Lägg till enhet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Device Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lägg till Bluetooth-enhet</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fordon *</Label>
                <Select value={formData.vehicle_id} onValueChange={(value) => setFormData({...formData, vehicle_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj fordon" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.gps_device_id).map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.registration_number} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Enhetstyp</Label>
                <Select value={formData.device_type} onValueChange={(value) => setFormData({...formData, device_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobiltelefon</SelectItem>
                    <SelectItem value="beacon">Bluetooth Beacon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>MAC-adress *</Label>
              <Input
                value={formData.mac_address}
                onChange={(e) => setFormData({...formData, mac_address: e.target.value.toUpperCase()})}
                placeholder="T.ex. BC64D97DF612"
                required
              />
              <p className="text-xs text-slate-500">MAC-adress utan kolon eller bindestreck</p>
            </div>

            <div className="space-y-2">
              <Label>Förare *</Label>
              <Select value={formData.driver_email} onValueChange={handleEmployeeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj förare" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.user_email} value={employee.user_email}>
                      {employee.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Förarkod/Personnummer *</Label>
              <Input
                value={formData.driver_code}
                onChange={(e) => setFormData({...formData, driver_code: e.target.value})}
                placeholder="T.ex. personnummer eller ID"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Anteckningar</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Valfri information"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Avbryt
              </Button>
              <Button type="submit" className="flex-1 bg-slate-900" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Lägger till...' : 'Lägg till enhet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}