import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, MapPin, Clock, Loader2, Filter, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import EditJournalModal from "@/components/journal/EditJournalModal";

export default function DrivingJournal() {
  const [user, setUser] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [expandedTrips, setExpandedTrips] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const all = await base44.entities.Project.list('-updated_date');
      return all.filter(p => p.status === 'pågående');
    },
  });

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-start_time', 300),
  });

  const [syncLoading, setSyncLoading] = useState(false);

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrivingJournalEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowEditModal(false);
      setSelectedEntry(null);
    },
  });

  const handleSyncAllVehicles = async () => {
    setSyncLoading(true);
    try {
      const response = await base44.functions.invoke('syncAllGPSTrips', {});
      await refetch();
      alert(`Synkronisering klar: ${response.data.totalSynced || 0} resor laddades`);
    } catch (error) {
      alert('Synkronisering misslyckades: ' + error.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  const handleSaveEntry = async (data) => {
    if (!selectedEntry) return;
    await updateEntryMutation.mutateAsync({
      id: selectedEntry.id,
      data
    });
  };

  // Group by vehicle
  const tripsByVehicle = vehicles.map(vehicle => {
    let trips = entries.filter(e => 
      e.vehicle_id === vehicle.id && !e.is_deleted
    );

    if (filterStatus === 'pending') {
      trips = trips.filter(e => e.trip_type === 'väntar');
    } else if (filterStatus === 'business') {
      trips = trips.filter(e => e.trip_type === 'tjänst');
    }

    return { vehicle, trips };
  }).filter(item => item.trips.length > 0 || filterVehicle === item.vehicle.id);

  const filteredVehicles = filterVehicle === 'all' 
    ? tripsByVehicle 
    : tripsByVehicle.filter(item => item.vehicle.id === filterVehicle);

  const totalTrips = tripsByVehicle.reduce((sum, item) => sum + item.trips.length, 0);
  const totalDistance = tripsByVehicle.reduce((sum, item) => 
    sum + item.trips.reduce((s, trip) => s + (trip.distance_km || 0), 0), 0
  );

  const toggleTripExpand = (tripId) => {
    setExpandedTrips(prev => ({
      ...prev,
      [tripId]: !prev[tripId]
    }));
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Körjournal</h1>
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{totalTrips} resor</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{totalDistance.toFixed(0)} km</span>
                </div>
              </div>
              <Button 
                onClick={handleSyncAllVehicles}
                disabled={syncLoading}
                className="bg-blue-600 hover:bg-blue-700 text-sm"
              >
                {syncLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Laddar...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Synka nu
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6">
            <Select value={filterVehicle} onValueChange={setFilterVehicle}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Alla fordon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla fordon</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registration_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Ej registrerade</SelectItem>
                <SelectItem value="business">Tjänsteresa</SelectItem>
                <SelectItem value="all">Alla</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : filteredVehicles.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga resor</h3>
                <p className="text-slate-500 text-sm">Ingen data att visa för de valda filtren</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredVehicles.map(({ vehicle, trips }) => (
                  <motion.div key={vehicle.id} layout>
                    <Card className="border-0 shadow-sm overflow-hidden">
                      {/* Vehicle Header */}
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Car className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{vehicle.registration_number}</p>
                              <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                            </div>
                          </div>
                          <Badge className="bg-amber-100 text-amber-800 border-0">
                            {trips.length} {trips.length === 1 ? 'resa' : 'resor'}
                          </Badge>
                        </div>
                      </div>

                      {/* Trips List */}
                      <CardContent className="p-0">
                        <div className="divide-y divide-slate-200">
                          {trips.map((trip) => {
                            const isExpanded = expandedTrips[trip.id];
                            return (
                              <motion.div key={trip.id} layout>
                              <div
                              onClick={() => toggleTripExpand(trip.id)}
                              className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                              <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-slate-900">
                                    {trip.start_time ? format(new Date(trip.start_time), 'dd MMM, HH:mm', { locale: sv }) : 'Okänd tid'}
                                        </span>
                                        {trip.is_anomaly && (
                                          <AlertCircle className="h-4 w-4 text-red-500" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Clock className="h-3 w-3" />
                                        <span>{Math.round(trip.duration_minutes || 0)} min</span>
                                        <span className="text-slate-400">•</span>
                                        <span>{trip.distance_km?.toFixed(1)} km</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {trip.trip_type === 'väntar' && (
                                        <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">
                                          Ej registrerad
                                        </Badge>
                                      )}
                                      {trip.trip_type === 'tjänst' && (
                                        <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                                          Tjänst
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">
                                      {trip.start_location?.address || 'Okänd plats'}
                                    </span>
                                  </div>
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="border-t border-slate-200 bg-slate-50 px-4 py-4"
                                    >
                                      <div className="space-y-4">
                                        {/* Trip Details */}
                                        <div className="space-y-2 text-sm">
                                          <div>
                                            <p className="text-slate-600">Från:</p>
                                            <p className="font-medium text-slate-900">
                                              {trip.start_location?.address || 'Okänd'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-slate-600">Till:</p>
                                            <p className="font-medium text-slate-900">
                                              {trip.end_location?.address || 'Okänd'}
                                            </p>
                                          </div>
                                          {trip.driver_name && (
                                            <div>
                                              <p className="text-slate-600">Förare:</p>
                                              <p className="font-medium text-slate-900">{trip.driver_name}</p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Project Allocation */}
                                        {trip.trip_type === 'väntar' && (
                                          <div>
                                            <label className="text-xs font-semibold text-slate-700 block mb-2">
                                              Allokera till projekt:
                                            </label>
                                            <Select
                                              value={trip.project_id || ''}
                                              onValueChange={async (projectId) => {
                                                const project = projects.find(p => p.id === projectId);
                                                await updateEntryMutation.mutateAsync({
                                                  id: trip.id,
                                                  data: {
                                                    trip_type: 'tjänst',
                                                    project_id: projectId,
                                                    project_code: project?.project_code,
                                                    customer: project?.customer,
                                                    status: 'submitted'
                                                  }
                                                });
                                              }}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
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
                                          </div>
                                        )}

                                        {/* Actions */}
                                        <Button
                                          size="sm"
                                          className="w-full bg-blue-600 hover:bg-blue-700"
                                          onClick={() => handleEditEntry(trip)}
                                        >
                                          Redigera
                                        </Button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <EditJournalModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEntry(null);
          }}
          entry={selectedEntry}
          onSave={handleSaveEntry}
        />
      </div>
    </PullToRefresh>
  );
}