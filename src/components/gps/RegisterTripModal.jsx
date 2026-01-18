import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RegisterTripModal({ open, onClose, trips = [], vehicleId, vehicleReg, onSuccess }) {
  const [tripData, setTripData] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    initialData: []
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: []
  });

  useEffect(() => {
    if (open && trips.length > 0) {
      const initial = trips.map(trip => ({
        trip,
        project_id: '',
        purpose: '',
        driver_email: '',
        project_km: trip.mileage || 0
      }));
      setTripData(initial);
    }
  }, [open, trips]);

  const updateTrip = (index, field, value) => {
    setTripData(prev => prev.map((t, i) => 
      i === index ? { ...t, [field]: value } : t
    ));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const user = await base44.auth.me();

      for (const item of tripData) {
        const selectedProject = projects.find(p => p.id === item.project_id);
        const selectedEmployee = employees.find(e => e.user_email === item.driver_email);
        const trip = item.trip;

        const driverEmail = item.driver_email || user.email;
        const driverName = selectedEmployee ? selectedEmployee.user_email : user.full_name;

        const journalEntry = {
          vehicle_id: vehicleId,
          registration_number: vehicleReg,
          gps_trip_id: trip.tripid?.toString(),
          driver_email: driverEmail,
          driver_name: driverName,
          start_time: new Date(trip.begintime * 1000).toISOString(),
          end_time: new Date(trip.endtime * 1000).toISOString(),
          start_location: {
            latitude: trip.beginlocation?.latitude,
            longitude: trip.beginlocation?.longitude,
            address: trip.beginlocation?.address || ''
          },
          end_location: {
            latitude: trip.endlocation?.latitude,
            longitude: trip.endlocation?.longitude,
            address: trip.endlocation?.address || ''
          },
          distance_km: trip.mileage || 0,
          duration_minutes: (trip.endtime - trip.begintime) / 60,
          trip_type: 'tjänst',
          purpose: item.purpose || 'Resa',
          project_id: item.project_id || null,
          project_code: selectedProject?.project_code || null,
          customer: selectedProject?.customer || null,
          status: 'submitted',
          project_allocations: item.project_id ? [{
            project_id: item.project_id,
            project_name: selectedProject?.name,
            distance_km: item.project_km || 0
          }] : []
        };

        await base44.entities.DrivingJournalEntry.create(journalEntry);
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error registering trips:', error);
      alert('Kunde inte registrera resorna: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fördela resor till projekt - {vehicleReg}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {tripData.map((item, idx) => (
            <div key={idx} className={`border rounded-lg p-3 ${
              item.trip.isRegistered ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {format(new Date(item.trip.begintime * 1000), 'EEE d MMM, HH:mm', { locale: sv })} - {format(new Date(item.trip.endtime * 1000), 'HH:mm', { locale: sv })}
                  </p>
                  <p className="text-xs text-slate-600">
                    {(item.trip.mileage || 0).toFixed(1)} km • {Math.round((item.trip.endtime - item.trip.begintime) / 60)} min
                  </p>
                </div>
                {item.trip.isRegistered && (
                  <Badge className="bg-green-600 text-white">Registrerad</Badge>
                )}
              </div>

              {!item.trip.isRegistered && (
                <div className="space-y-2 mt-3 pt-3 border-t">
                  <div>
                    <Label className="text-xs">Förare</Label>
                    <Select
                      value={item.driver_email}
                      onValueChange={(value) => updateTrip(idx, 'driver_email', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Välj förare" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.user_email}>
                            {employee.user_email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Projekt</Label>
                    <Select
                      value={item.project_id}
                      onValueChange={(value) => updateTrip(idx, 'project_id', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Välj projekt" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.filter(p => p.status === 'pågående').map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Antal km till projekt</Label>
                    <Input
                      className="h-9"
                      type="number"
                      step="0.1"
                      value={item.project_km}
                      onChange={(e) => updateTrip(idx, 'project_km', parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Syfte</Label>
                    <Input
                      className="h-9"
                      value={item.purpose}
                      onChange={(e) => updateTrip(idx, 'purpose', e.target.value)}
                      placeholder="T.ex. Kundbesök, leverans..."
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-3 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrerar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Registrera resor
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}