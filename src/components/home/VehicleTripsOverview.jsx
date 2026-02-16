import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, MapPin, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function VehicleTripsOverview() {
  const [expandedVehicle, setExpandedVehicle] = useState(null);
  const [selectedTripsForAllocation, setSelectedTripsForAllocation] = useState({});
  const [allocatingProject, setAllocatingProject] = useState(null);
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-created_date', 500),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const all = await base44.entities.Project.list('-updated_date');
      return all.filter(p => p.status === 'pågående');
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrivingJournalEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setAllocatingProject(null);
    },
  });

  // Group trips by vehicle
  const vehicleTrips = vehicles.map(vehicle => {
    const trips = entries.filter(e => 
      e.vehicle_id === vehicle.id && 
      e.trip_type === 'väntar' && 
      !e.is_deleted
    );
    return { vehicle, trips };
  }).filter(item => item.trips.length > 0);

  const handleAllocateTripsToProject = async (tripIds, projectId) => {
    if (!projectId) return;
    
    for (const tripId of tripIds) {
      const trip = entries.find(e => e.id === tripId);
      if (trip) {
        await updateEntryMutation.mutateAsync({
          id: tripId,
          data: {
            trip_type: 'tjänst',
            project_id: projectId,
            project_code: projects.find(p => p.id === projectId)?.project_code,
            status: 'submitted'
          }
        });
      }
    }
    setSelectedTripsForAllocation({});
  };

  const toggleTripSelection = (tripId) => {
    setSelectedTripsForAllocation(prev => ({
      ...prev,
      [tripId]: !prev[tripId]
    }));
  };

  if (vehicleTrips.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Fordon med oregistrerade resor</h2>
      
      <div className="space-y-3">
        <AnimatePresence>
          {vehicleTrips.map(({ vehicle, trips }) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="border-0 shadow-sm">
                <div
                  onClick={() => setExpandedVehicle(expandedVehicle === vehicle.id ? null : vehicle.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Car className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{vehicle.registration_number}</p>
                        <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-0">
                      {trips.length} resor
                    </Badge>
                  </div>
                </div>

                {expandedVehicle === vehicle.id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-slate-200"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Allocation Controls */}
                      <div className="bg-blue-50 p-3 rounded-lg flex gap-2">
                        <Select value={allocatingProject || ''} onValueChange={setAllocatingProject}>
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue placeholder="Välj projekt..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={!allocatingProject || Object.values(selectedTripsForAllocation).every(v => !v) || updateEntryMutation.isPending}
                          onClick={() => {
                            const selectedIds = Object.entries(selectedTripsForAllocation)
                              .filter(([_, selected]) => selected)
                              .map(([id]) => id);
                            if (selectedIds.length > 0) {
                              handleAllocateTripsToProject(selectedIds, allocatingProject);
                            }
                          }}
                        >
                          {updateEntryMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>Allokera {Object.values(selectedTripsForAllocation).filter(v => v).length}</>
                          )}
                        </Button>
                      </div>

                      {/* Trip List */}
                      <div className="space-y-2">
                        {trips.map(trip => (
                          <div
                            key={trip.id}
                            className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTripsForAllocation[trip.id] || false}
                              onChange={() => toggleTripSelection(trip.id)}
                              className="mt-1 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-xs font-medium text-slate-900">
                                  {format(new Date(trip.start_time), 'dd MMM, HH:mm', { locale: sv })}
                                </p>
                                <span className="text-xs font-semibold text-slate-600">
                                  {trip.distance_km?.toFixed(1)} km
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">
                                  {trip.start_location?.address || 'Okänd plats'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}