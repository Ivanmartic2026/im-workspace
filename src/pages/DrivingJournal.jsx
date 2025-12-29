import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, AlertTriangle, CheckCircle, Car, Download, RefreshCw, Loader2, BarChart3 } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import JournalEntryCard from "@/components/journal/JournalEntryCard";
import JournalStatsCard from "@/components/journal/JournalStatsCard";
import EditJournalModal from "@/components/journal/EditJournalModal";

export default function DrivingJournal() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-created_date', 200),
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrivingJournalEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowEditModal(false);
      setSelectedEntry(null);
    },
  });

  const syncTripsMutation = useMutation({
    mutationFn: async ({ vehicleId }) => {
      const today = new Date();
      const startDate = format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");
      const endDate = format(endOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");
      
      const response = await base44.functions.invoke('syncGPSTrips', {
        vehicleId,
        startDate,
        endDate
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      alert(`${data.synced} resor synkroniserade, ${data.skipped} hoppades över`);
    },
    onError: (error) => {
      alert('Kunde inte synkronisera resor: ' + error.message);
    }
  });

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

  const handleApprove = async (entry) => {
    await updateEntryMutation.mutateAsync({
      id: entry.id,
      data: {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const handleRequestInfo = async (entry) => {
    const comment = prompt('Ange kommentar till föraren:');
    if (!comment) return;
    
    await updateEntryMutation.mutateAsync({
      id: entry.id,
      data: {
        status: 'requires_info',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment
      }
    });
  };

  const handleSync = async () => {
    if (selectedVehicle === 'all') {
      alert('Välj ett specifikt fordon för att synkronisera');
      return;
    }
    await syncTripsMutation.mutateAsync({ vehicleId: selectedVehicle });
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesTab = user?.role === 'admin' 
      ? (activeTab === 'pending' ? entry.status === 'pending_review' || entry.status === 'submitted' :
         activeTab === 'approved' ? entry.status === 'approved' :
         activeTab === 'all' ? true : false)
      : (activeTab === 'pending' ? entry.status === 'pending_review' || entry.status === 'requires_info' :
         activeTab === 'submitted' ? entry.status === 'submitted' :
         activeTab === 'approved' ? entry.status === 'approved' : false);
    
    const matchesDriver = user?.role === 'admin' || entry.driver_email === user?.email;
    const matchesVehicle = selectedVehicle === 'all' || entry.vehicle_id === selectedVehicle;
    
    // Period filter
    const entryDate = new Date(entry.start_time);
    const now = new Date();
    let matchesPeriod = true;
    
    if (selectedPeriod === 'today') {
      matchesPeriod = format(entryDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    } else if (selectedPeriod === 'week') {
      matchesPeriod = entryDate >= startOfWeek(now, { weekStartsOn: 1 }) && 
                      entryDate <= endOfWeek(now, { weekStartsOn: 1 });
    } else if (selectedPeriod === 'month') {
      matchesPeriod = entryDate >= startOfMonth(now) && entryDate <= endOfMonth(now);
    }
    
    return matchesTab && matchesDriver && matchesVehicle && matchesPeriod;
  });

  // Calculate stats
  const stats = {
    totalTrips: filteredEntries.length,
    totalDistance: filteredEntries.reduce((sum, e) => sum + (e.distance_km || 0), 0),
    totalDuration: filteredEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
    businessTrips: filteredEntries.filter(e => e.trip_type === 'tjänst').length,
    privateTrips: filteredEntries.filter(e => e.trip_type === 'privat').length,
    pendingTrips: filteredEntries.filter(e => e.trip_type === 'väntar').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Körjournal</h1>
              <p className="text-sm text-slate-500 mt-1">
                {user?.role === 'admin' ? 'Administrera körjournaler' : 'Hantera dina resor'}
              </p>
            </div>
            <div className="flex gap-2">
              {user?.role === 'admin' && (
                <>
                  <Link to={createPageUrl('DrivingJournalReports')}>
                    <Button size="sm" variant="outline">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSync}
                    disabled={syncTripsMutation.isPending || selectedVehicle === 'all'}
                    size="sm"
                    variant="outline"
                  >
                    {syncTripsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <JournalStatsCard stats={stats} />

          {/* Filters */}
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Idag</SelectItem>
                    <SelectItem value="week">Denna vecka</SelectItem>
                    <SelectItem value="month">Denna månad</SelectItem>
                    <SelectItem value="all">Alla</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj fordon" />
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
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="w-full bg-white shadow-sm">
              {user?.role === 'admin' ? (
                <>
                  <TabsTrigger value="pending" className="flex-1">
                    Väntande
                    {entries.filter(e => e.status === 'pending_review' || e.status === 'submitted').length > 0 && (
                      <Badge className="ml-2 bg-amber-500">{entries.filter(e => e.status === 'pending_review' || e.status === 'submitted').length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="flex-1">Godkända</TabsTrigger>
                  <TabsTrigger value="all" className="flex-1">Alla</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="pending" className="flex-1">
                    Att fylla i
                    {entries.filter(e => (e.status === 'pending_review' || e.status === 'requires_info') && e.driver_email === user?.email).length > 0 && (
                      <Badge className="ml-2 bg-amber-500">
                        {entries.filter(e => (e.status === 'pending_review' || e.status === 'requires_info') && e.driver_email === user?.email).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="submitted" className="flex-1">Inskickade</TabsTrigger>
                  <TabsTrigger value="approved" className="flex-1">Godkända</TabsTrigger>
                </>
              )}
            </TabsList>
          </Tabs>

          {/* Entries List */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga resor att visa</h3>
                <p className="text-slate-500 text-sm">
                  {activeTab === 'pending' 
                    ? 'Inga väntande körjournaler just nu' 
                    : 'Inga resor hittades för denna period'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  vehicle={vehicles.find(v => v.id === entry.vehicle_id)}
                  onEdit={handleEditEntry}
                  onApprove={user?.role === 'admin' ? handleApprove : null}
                  onRequestInfo={user?.role === 'admin' ? handleRequestInfo : null}
                  isAdmin={user?.role === 'admin'}
                />
              ))}
            </div>
          )}
        </motion.div>
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
  );
}