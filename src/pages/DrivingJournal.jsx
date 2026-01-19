import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Calendar, MapPin, Clock, AlertTriangle, CheckCircle, Car, Download, RefreshCw, Loader2, BarChart3, Settings, FileDown, Users, Sparkles, Search, ArrowUpDown, ArrowUp, ArrowDown, List, LayoutGrid, Plus, TrendingUp, Navigation, Gauge } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip as MapTooltip } from 'react-leaflet';
import VehicleStatusBadge from '@/components/gps/VehicleStatusBadge';
import GeofenceAlerts from '@/components/gps/GeofenceAlerts';
import UnregisteredTrips from '@/components/gps/UnregisteredTrips';
import GeofenceManager, { GeofenceOverlay } from '@/components/gps/GeofenceManager';
import GeofenceNotifications from '@/components/gps/GeofenceNotifications';
import 'leaflet/dist/leaflet.css';
import LeafletLib from 'leaflet';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import JournalEntryCard from "@/components/journal/JournalEntryCard";
import JournalStatsCard from "@/components/journal/JournalStatsCard";
import EditJournalModal from "@/components/journal/EditJournalModal";
import ManualTripModal from "@/components/journal/ManualTripModal";
import SuggestionsView from "@/components/journal/SuggestionsView";
import QuickApproveCard from "@/components/journal/QuickApproveCard";

// Fix default marker icons
delete LeafletLib.Icon.Default.prototype._getIconUrl;
LeafletLib.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function DrivingJournal() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('register');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportLoading, setExportLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [selectedForAI, setSelectedForAI] = useState(new Set());
  const [processingDrafts, setProcessingDrafts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortField, setSortField] = useState('start_time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [tripsPeriod, setTripsPeriod] = useState('week');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => base44.entities.Geofence.list(),
  });

  const { data: gpsDevicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['gps-devices'],
    queryFn: async () => {
      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getDeviceList',
        params: {}
      });
      return response.data;
    },
    enabled: activeTab === 'live' || activeTab === 'register',
    refetchInterval: activeTab === 'live' ? 30000 : false,
    retry: 2
  });

  const allDevices = gpsDevicesData?.groups?.flatMap(group => group.devices || []) || [];
  const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);

  const { data: positionsData } = useQuery({
    queryKey: ['gps-all-positions', allDevices],
    queryFn: async () => {
      if (allDevices.length === 0) return null;
      const deviceIds = allDevices.map(d => d.deviceid);
      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getLastPosition',
        params: { deviceIds }
      });
      return response.data;
    },
    enabled: allDevices.length > 0 && (activeTab === 'live' || activeTab === 'register'),
    refetchInterval: activeTab === 'live' ? 30000 : false,
  });

  const positions = positionsData?.records || [];
  const centerPos = positions[0] ? [positions[0].callat, positions[0].callon] : [59.3293, 18.0686];

  const getVehicleStatus = (speed) => {
    const speedKmh = speed * 3.6;
    if (speedKmh > 5) return 'kör';
    if (speedKmh > 0) return 'långsamt';
    return 'parkerad';
  };

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-created_date', 200),
  });

  // Auto-sync GPS trips on mount and periodically
  useEffect(() => {
    const autoSync = async () => {
      if (user?.role !== 'admin' || vehicles.length === 0) return;
      
      const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);
      if (vehiclesWithGPS.length === 0) return;

      const today = new Date();
      const startDate = format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");
      const endDate = format(endOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");

      for (const vehicle of vehiclesWithGPS) {
        try {
          await base44.functions.invoke('syncGPSTrips', {
            vehicleId: vehicle.id,
            startDate,
            endDate
          });
        } catch (error) {
          console.error(`Failed to auto-sync ${vehicle.registration_number}:`, error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    };

    autoSync();
    const interval = setInterval(autoSync, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [user, vehicles, queryClient]);

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
    const changeEntry = {
      timestamp: new Date().toISOString(),
      changed_by: user.email,
      change_type: 'approved',
      comment: 'Godkänd av administratör'
    };

    await updateEntryMutation.mutateAsync({
      id: entry.id,
      data: {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        change_history: [
          ...(entry.change_history || []),
          changeEntry
        ]
      }
    });
  };

  const handleRequestInfo = async (entry) => {
    const comment = prompt('Ange kommentar till föraren:');
    if (!comment) return;

    const changeEntry = {
      timestamp: new Date().toISOString(),
      changed_by: user.email,
      change_type: 'status_changed',
      comment: `Kräver mer information: ${comment}`
    };
    
    await updateEntryMutation.mutateAsync({
      id: entry.id,
      data: {
        status: 'requires_info',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        review_comment: comment,
        change_history: [
          ...(entry.change_history || []),
          changeEntry
        ]
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

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const response = await base44.functions.invoke('exportJournalPDF', {
        startDate: startDate,
        endDate: endDate,
        vehicleId: selectedVehicle !== 'all' ? selectedVehicle : null,
        employeeEmail: selectedEmployee !== 'all' ? selectedEmployee : null
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `körjournal_${startDate}_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Kunde inte exportera PDF: ' + error.message);
    }
    setExportLoading(false);
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const response = await base44.functions.invoke('exportJournalCSV', {
        startDate: startDate,
        endDate: endDate,
        vehicleId: selectedVehicle !== 'all' ? selectedVehicle : null,
        employeeEmail: selectedEmployee !== 'all' ? selectedEmployee : null
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `körjournal_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Kunde inte exportera CSV: ' + error.message);
    }
    setExportLoading(false);
  };

  const handleAnalyzeWithAI = async () => {
    const entriesToAnalyze = filteredEntries.filter(e => 
      e.trip_type === 'väntar' && e.status === 'pending_review'
    );

    if (entriesToAnalyze.length === 0) {
      alert('Inga resor att analysera. Endast resor med typ "väntar" kan analyseras.');
      return;
    }

    setAnalyzingAI(true);
    setActiveTab('journal-suggestions');

    try {
      const response = await base44.functions.invoke('analyzeTrips', {
        entryIds: entriesToAnalyze.map(e => e.id)
      });

      setAiSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Error analyzing trips:', error);
      alert('Kunde inte analysera resor med AI: ' + error.message);
      setActiveTab('journal-pending');
    }

    setAnalyzingAI(false);
  };

  const handleAcceptSuggestion = async (entryId, suggestion) => {
    const updateData = {
      trip_type: suggestion.tripType,
      status: 'submitted'
    };

    if (suggestion.tripType === 'tjänst') {
      if (suggestion.purpose) updateData.purpose = suggestion.purpose;
      if (suggestion.projectCode) updateData.project_code = suggestion.projectCode;
      if (suggestion.customer) updateData.customer = suggestion.customer;
    }

    await updateEntryMutation.mutateAsync({ id: entryId, data: updateData });
    setAiSuggestions(prev => prev.filter(s => s.entryId !== entryId));
    
    if (aiSuggestions.length <= 1) {
      setActiveTab('journal-pending');
    }
  };

  const handleRejectSuggestion = (entryId) => {
    setAiSuggestions(prev => prev.filter(s => s.entryId !== entryId));
    
    if (aiSuggestions.length <= 1) {
      setActiveTab('journal-pending');
    }
  };

  const handleEditSuggestion = async (entryId, data) => {
    const updateData = {
      trip_type: data.trip_type,
      status: 'submitted'
    };

    if (data.trip_type === 'tjänst') {
      if (data.purpose) updateData.purpose = data.purpose;
      if (data.project_code) updateData.project_code = data.project_code;
      if (data.customer) updateData.customer = data.customer;
      if (data.notes) updateData.notes = data.notes;
    }

    await updateEntryMutation.mutateAsync({ id: entryId, data: updateData });
    setAiSuggestions(prev => prev.filter(s => s.entryId !== entryId));
    
    if (aiSuggestions.length <= 1) {
      setActiveTab('journal-pending');
    }
  };

  const handleProcessDrafts = async () => {
    setProcessingDrafts(true);
    try {
      const response = await base44.functions.invoke('autoProcessJournal', {});
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      
      if (response.data.results.suggestions > 0) {
        alert(`${response.data.results.suggestions} resor har fått AI-förslag. Granska dem under "Utkast"-fliken.`);
        setActiveTab('journal-drafts');
      } else {
        alert('Inga nya förslag skapades. Kanske finns det ingen historisk data att basera förslag på.');
      }
    } catch (error) {
      alert('Kunde inte bearbeta resor: ' + error.message);
    }
    setProcessingDrafts(false);
  };

  const handleQuickApprove = async (entry) => {
    await updateEntryMutation.mutateAsync({
      id: entry.id,
      data: {
        status: 'submitted',
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const handleRejectDraft = async (entry) => {
    await updateEntryMutation.mutateAsync({
      id: entry.id,
      data: {
        trip_type: 'väntar',
        purpose: null,
        project_code: null,
        customer: null,
        suggested_classification: null,
        notes: entry.notes?.replace(/\[AI\].*$/gm, '').trim()
      }
    });
  };

  const handleDeleteRequest = (entry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;

    const changeEntry = {
      timestamp: new Date().toISOString(),
      changed_by: user.email,
      change_type: 'deleted',
      comment: 'Markerad som raderad (soft delete)'
    };

    await updateEntryMutation.mutateAsync({
      id: entryToDelete.id,
      data: {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.email,
        change_history: [
          ...(entryToDelete.change_history || []),
          changeEntry
        ]
      }
    });

    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  // Filter entries
  const draftEntries = entries.filter(entry => 
    entry.suggested_classification && 
    entry.trip_type !== 'väntar' && 
    entry.status === 'pending_review' &&
    (user?.role === 'admin' || entry.driver_email === user?.email)
  );

  const filteredEntries = entries.filter(entry => {
    // Filtrera bort raderade poster
    if (entry.is_deleted) return false;

    const matchesTab = user?.role === 'admin' 
      ? (activeTab === 'journal-pending' ? (entry.status === 'pending_review' || entry.status === 'submitted') && !entry.suggested_classification :
         activeTab === 'journal-drafts' ? entry.suggested_classification && entry.status === 'pending_review' :
         activeTab === 'journal-approved' ? entry.status === 'approved' :
         activeTab === 'journal-all' ? true : false)
      : (activeTab === 'journal-pending' ? (entry.status === 'pending_review' || entry.status === 'requires_info') && entry.trip_type === 'väntar' :
         activeTab === 'journal-drafts' ? entry.suggested_classification && entry.status === 'pending_review' :
         activeTab === 'journal-submitted' ? entry.status === 'submitted' :
         activeTab === 'journal-approved' ? entry.status === 'approved' : false);
    
    const matchesDriver = user?.role === 'admin' || entry.driver_email === user?.email;
    const matchesVehicle = selectedVehicle === 'all' || entry.vehicle_id === selectedVehicle;
    const matchesEmployee = selectedEmployee === 'all' || entry.driver_email === selectedEmployee;
    
    // Search filter
    const matchesSearch = !searchQuery || 
      entry.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.customer?.toLowerCase().includes(searchQuery.toLowerCase());
    
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
    } else if (selectedPeriod === 'custom') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesPeriod = entryDate >= start && entryDate <= end;
    }
    
    return matchesTab && matchesDriver && matchesVehicle && matchesPeriod && matchesEmployee && matchesSearch;
  });

  // Sort entries
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortField) {
      case 'start_time':
        aVal = new Date(a.start_time).getTime();
        bVal = new Date(b.start_time).getTime();
        break;
      case 'distance_km':
        aVal = a.distance_km || 0;
        bVal = b.distance_km || 0;
        break;
      case 'duration_minutes':
        aVal = a.duration_minutes || 0;
        bVal = b.duration_minutes || 0;
        break;
      case 'driver_name':
        aVal = a.driver_name || '';
        bVal = b.driver_name || '';
        break;
      case 'registration_number':
        aVal = a.registration_number || '';
        bVal = b.registration_number || '';
        break;
      default:
        return 0;
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleQuickClassify = async (entryId, tripType) => {
    await updateEntryMutation.mutateAsync({
      id: entryId,
      data: { trip_type: tripType }
    });
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 ml-1" /> : 
      <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Calculate stats
  const stats = {
    totalTrips: filteredEntries.length,
    totalDistance: filteredEntries.reduce((sum, e) => sum + (e.distance_km || 0), 0),
    totalDuration: filteredEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0),
    businessTrips: filteredEntries.filter(e => e.trip_type === 'tjänst').length,
    privateTrips: filteredEntries.filter(e => e.trip_type === 'privat').length,
    pendingTrips: filteredEntries.filter(e => e.trip_type === 'väntar').length,
    actionRequired: filteredEntries.filter(e => e.status === 'pending_review' && e.trip_type === 'väntar').length,
    pending: entries.filter(e => (e.status === 'pending_review' || e.status === 'submitted') && !e.suggested_classification).length,
    approved: entries.filter(e => e.status === 'approved').length,
    total: entries.length,
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Körjournal</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-white shadow-sm grid grid-cols-2 mb-4">
            <TabsTrigger value="register">Registrera Resor</TabsTrigger>
            <TabsTrigger value="journal">Körjournal</TabsTrigger>
          </TabsList>

          {/* Live Tracking Tab */}
          <TabsContent value="live">
              {devicesLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
                </div>
              ) : allDevices.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga GPS-enheter</h3>
                    <p className="text-slate-500 text-sm">
                      Inga fordon med GPS-enheter hittades
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <GeofenceNotifications 
                    positions={positions} 
                    vehicles={vehiclesWithGPS}
                    geofences={geofences}
                  />

                  <GeofenceManager />

                  <Card className="border-0 shadow-sm overflow-hidden mb-4">
                    <div className="h-[400px]">
                      {positions.length > 0 ? (
                        <MapContainer
                          center={centerPos}
                          zoom={12}
                          style={{ height: '100%', width: '100%' }}
                          scrollWheelZoom={false}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                          />
                          <GeofenceOverlay geofences={geofences} />
                          {positions.map((pos) => {
                            const vehicle = vehiclesWithGPS.find(v => v.gps_device_id === pos.deviceid);
                            const device = allDevices.find(d => d.deviceid === pos.deviceid);
                            const displayName = vehicle?.registration_number || device?.devicename || pos.deviceid;
                            const status = getVehicleStatus(pos.speed);
                            
                            return (
                              <Marker key={pos.deviceid} position={[pos.callat, pos.callon]}>
                                <MapTooltip permanent direction="top" offset={[0, -20]}>
                                  <div className="font-semibold text-xs">
                                    {displayName}
                                  </div>
                                </MapTooltip>
                                <Popup>
                                  <div className="min-w-[200px]">
                                    <p className="font-semibold">{displayName}</p>
                                    {vehicle && <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>}
                                    <div className="mt-2 space-y-1">
                                      <p className="text-sm">
                                        <Gauge className="h-3 w-3 inline mr-1" />
                                        {Math.round(pos.speed * 3.6)} km/h
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {pos.posiTime ? format(new Date(pos.posiTime * 1000), 'PPp', { locale: sv }) : 'Okänd tid'}
                                      </p>
                                    </div>
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          })}
                        </MapContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center bg-slate-50">
                          <p className="text-slate-500">Ingen position tillgänglig</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="space-y-3">
                    {allDevices.map(device => {
                      const vehicle = vehiclesWithGPS.find(v => v.gps_device_id === device.deviceid);
                      const currentPos = positions.find(p => p.deviceid === device.deviceid);
                      const status = currentPos ? getVehicleStatus(currentPos.speed) : 'okänd';

                      return (
                        <Card key={device.deviceid} className="border-0 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-slate-900">{vehicle?.registration_number || device.devicename}</h3>
                                <p className="text-xs text-slate-500">{vehicle?.make} {vehicle?.model}</p>
                              </div>
                              {currentPos && <VehicleStatusBadge status={status} />}
                            </div>
                            {currentPos && (
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <Gauge className="h-4 w-4 text-slate-400" />
                                  <span className="text-slate-600">{Math.round(currentPos.speed * 3.6)} km/h</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  Senast: {currentPos.posiTime ? format(new Date(currentPos.posiTime * 1000), 'HH:mm', { locale: sv }) : 'Okänd'}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            {/* Månadsöversikt */}
            <Card className="border-0 shadow-sm mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Oregistrerade resor per månad</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Gruppera oregistrerade resor per månad
                  const unregisteredTrips = entries.filter(e => e.trip_type === 'väntar' && !e.is_deleted);
                  
                  const tripsByMonth = unregisteredTrips.reduce((acc, trip) => {
                    const monthKey = format(new Date(trip.start_time), 'yyyy-MM');
                    if (!acc[monthKey]) {
                      acc[monthKey] = [];
                    }
                    acc[monthKey].push(trip);
                    return acc;
                  }, {});
                  
                  const sortedMonths = Object.keys(tripsByMonth).sort((a, b) => new Date(b) - new Date(a));
                  
                  if (sortedMonths.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="text-slate-600">Alla resor är registrerade!</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      {sortedMonths.map(monthKey => {
                        const monthTrips = tripsByMonth[monthKey];
                        const totalKm = monthTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
                        const monthDate = new Date(monthKey + '-01');
                        
                        // Gruppera resor per dag inom månaden
                        const tripsByDay = monthTrips.reduce((acc, trip) => {
                          const dayKey = format(new Date(trip.start_time), 'yyyy-MM-dd');
                          if (!acc[dayKey]) {
                            acc[dayKey] = [];
                          }
                          acc[dayKey].push(trip);
                          return acc;
                        }, {});
                        
                        const sortedDays = Object.keys(tripsByDay).sort((a, b) => new Date(b) - new Date(a));
                        
                        return (
                          <div key={monthKey} className="border rounded-lg p-4 bg-slate-50">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-slate-900">
                                {format(monthDate, 'MMMM yyyy', { locale: sv })}
                              </h3>
                              <Badge className="bg-amber-500">
                                {monthTrips.length} resor • {totalKm.toFixed(1)} km
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              {sortedDays.map(dayKey => {
                                const dayTrips = tripsByDay[dayKey];
                                const dayTotalKm = dayTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
                                const isToday = isSameDay(new Date(dayKey), new Date());
                                
                                return (
                                  <div key={dayKey} className="bg-white rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-slate-700">
                                        {isToday ? 'Idag' : format(new Date(dayKey), 'EEEE d MMMM', { locale: sv })}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        {dayTrips.length} resor • {dayTotalKm.toFixed(1)} km
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-1">
                                      {dayTrips.map(trip => (
                                        <div key={trip.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                                          <div className="flex items-center gap-2">
                                            <Car className="h-3 w-3 text-slate-400" />
                                            <span className="font-medium">{trip.registration_number}</span>
                                            <span className="text-slate-500">
                                              {format(new Date(trip.start_time), 'HH:mm')} - {format(new Date(trip.end_time), 'HH:mm')}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-slate-600">{trip.distance_km?.toFixed(1)} km</span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 px-2 text-xs"
                                              onClick={() => handleEditEntry(trip)}
                                            >
                                              Fyll i
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <UnregisteredTrips vehicles={vehicles} />
          </TabsContent>

          {/* Journal Tab */}
          <TabsContent value="journal">
              <Tabs value={activeTab.startsWith('journal-') ? activeTab : 'journal-pending'} onValueChange={setActiveTab} className="mb-4">
                <TabsList className="w-full bg-white shadow-sm grid grid-cols-5">
              {user?.role === 'admin' ? (
                <>
                  <TabsTrigger value="journal-pending" className="flex-col gap-1 py-3">
                    <span>Väntande</span>
                    {stats.pending > 0 && (
                      <Badge className="bg-amber-500 text-white text-xs px-2 py-0 h-5">{stats.pending}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="journal-drafts">
                    Utkast
                    {draftEntries.length > 0 && (
                      <Badge className="ml-1 bg-indigo-500 text-xs">{draftEntries.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="journal-suggestions">
                    AI-analys
                    {aiSuggestions.length > 0 && (
                      <Badge className="ml-1 bg-purple-500 text-xs">{aiSuggestions.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="journal-approved" className="flex-col gap-1 py-3">
                    <span>Godkända</span>
                    <Badge className="bg-emerald-500 text-white text-xs px-2 py-0 h-5">{stats.approved}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="journal-all" className="flex-col gap-1 py-3">
                    <span>Alla</span>
                    <Badge className="bg-slate-500 text-white text-xs px-2 py-0 h-5">{stats.total}</Badge>
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="journal-pending">
                    Att fylla i
                    {entries.filter(e => (e.status === 'pending_review' || e.status === 'requires_info') && e.driver_email === user?.email && e.trip_type === 'väntar').length > 0 && (
                      <Badge className="ml-1 bg-amber-500 text-xs">
                        {entries.filter(e => (e.status === 'pending_review' || e.status === 'requires_info') && e.driver_email === user?.email && e.trip_type === 'väntar').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="journal-drafts">
                    Utkast
                    {draftEntries.length > 0 && (
                      <Badge className="ml-1 bg-indigo-500 text-xs">{draftEntries.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="journal-suggestions">
                    AI-analys
                    {aiSuggestions.length > 0 && (
                      <Badge className="ml-1 bg-purple-500 text-xs">{aiSuggestions.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="journal-submitted">Inskickade</TabsTrigger>
                  <TabsTrigger value="journal-approved">Godkända</TabsTrigger>
                </>
              )}
            </TabsList>
              </Tabs>

          {/* Journal Content Based on Sub-Tab */}
          {activeTab.startsWith('journal-') && (
            <>
              {activeTab === 'journal-drafts' ? (
                <>
                  {/* Process Drafts Button */}
                  <Card className="border-0 shadow-sm mb-4 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">Skapa AI-utkast</p>
                            <p className="text-xs text-slate-600">
                              Analysera resor och skapa förslag baserat på historik
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleProcessDrafts}
                          disabled={processingDrafts}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {processingDrafts ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Bearbetar...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Skapa utkast
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {draftEntries.length === 0 ? (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-12 text-center">
                        <Sparkles className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga utkast</h3>
                        <p className="text-slate-500 text-sm">
                          Klicka på "Skapa utkast" för att låta AI analysera oklassificerade resor
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {draftEntries.map(entry => (
                        <QuickApproveCard
                          key={entry.id}
                          entry={entry}
                          vehicle={vehicles.find(v => v.id === entry.vehicle_id)}
                          onApprove={handleQuickApprove}
                          onEdit={handleEditEntry}
                          onReject={handleRejectDraft}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : activeTab === 'journal-suggestions' ? (
                <SuggestionsView
                  suggestions={aiSuggestions}
                  onAccept={handleAcceptSuggestion}
                  onReject={handleRejectSuggestion}
                  onEdit={handleEditSuggestion}
                  isLoading={analyzingAI}
                />
              ) : (
                <>
                  {/* AI Analyze Button */}
                  {activeTab === 'journal-pending' && filteredEntries.some(e => e.trip_type === 'väntar') && (
                    <Card className="border-0 shadow-sm mb-4 bg-gradient-to-r from-indigo-50 to-purple-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <Sparkles className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">AI-assisterad klassificering</p>
                              <p className="text-xs text-slate-600">
                                Låt AI analysera och föreslå klassificering för dina resor
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={handleAnalyzeWithAI}
                            disabled={analyzingAI}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            {analyzingAI ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyserar...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Analysera med AI
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

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
                        <p className="text-slate-500 text-sm mb-4">
                          {entries.length === 0 
                            ? 'Inga körjournalsposter finns i systemet ännu.' 
                            : activeTab === 'journal-pending' 
                            ? 'Inga väntande körjournaler just nu' 
                            : 'Inga resor hittades för denna period'}
                        </p>
                      </CardContent>
                    </Card>
                  ) : viewMode === 'table' ? (
                    <Card className="border-0 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="cursor-pointer" onClick={() => handleSort('start_time')}>
                                <div className="flex items-center">
                                  Datum
                                  <SortIcon field="start_time" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer" onClick={() => handleSort('registration_number')}>
                                <div className="flex items-center">
                                  Fordon
                                  <SortIcon field="registration_number" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer" onClick={() => handleSort('driver_name')}>
                                <div className="flex items-center">
                                  Förare
                                  <SortIcon field="driver_name" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('distance_km')}>
                                <div className="flex items-center justify-end">
                                  Distans
                                  <SortIcon field="distance_km" />
                                </div>
                              </TableHead>
                              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('duration_minutes')}>
                                <div className="flex items-center justify-end">
                                  Tid
                                  <SortIcon field="duration_minutes" />
                                </div>
                              </TableHead>
                              <TableHead>Typ</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Åtgärd</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedEntries.map(entry => (
                              <TableRow key={entry.id} className="hover:bg-slate-50">
                                <TableCell className="font-medium">
                                  <div className="text-sm">{format(new Date(entry.start_time), 'dd MMM yyyy', { locale: sv })}</div>
                                  <div className="text-xs text-slate-500">{format(new Date(entry.start_time), 'HH:mm')}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm font-medium">{entry.registration_number}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">{entry.driver_name || 'Okänd'}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="text-sm font-medium">{entry.distance_km?.toFixed(1)} km</div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="text-sm">{Math.round(entry.duration_minutes || 0)} min</div>
                                </TableCell>
                                <TableCell>
                                  {entry.trip_type === 'väntar' ? (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => handleQuickClassify(entry.id, 'tjänst')}
                                      >
                                        Tjänst
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => handleQuickClassify(entry.id, 'privat')}
                                      >
                                        Privat
                                      </Button>
                                    </div>
                                  ) : (
                                    <Badge 
                                      className={
                                        entry.trip_type === 'tjänst' ? 'bg-blue-100 text-blue-800' :
                                        entry.trip_type === 'privat' ? 'bg-purple-100 text-purple-800' :
                                        'bg-amber-100 text-amber-800'
                                      }
                                    >
                                      {entry.trip_type}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline"
                                    className={
                                      entry.status === 'approved' ? 'border-green-500 text-green-700' :
                                      entry.status === 'submitted' ? 'border-blue-500 text-blue-700' :
                                      entry.status === 'requires_info' ? 'border-red-500 text-red-700' :
                                      'border-amber-500 text-amber-700'
                                    }
                                  >
                                    {entry.status === 'approved' ? 'Godkänd' :
                                     entry.status === 'submitted' ? 'Inskickad' :
                                     entry.status === 'requires_info' ? 'Kräver info' :
                                     'Väntande'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditEntry(entry)}
                                  >
                                    Visa
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {sortedEntries.map(entry => (
                        <JournalEntryCard
                          key={entry.id}
                          entry={entry}
                          vehicle={vehicles.find(v => v.id === entry.vehicle_id)}
                          onEdit={handleEditEntry}
                          onApprove={user?.role === 'admin' ? handleApprove : null}
                          onRequestInfo={user?.role === 'admin' ? handleRequestInfo : null}
                          onDelete={user?.role === 'admin' ? handleDeleteRequest : null}
                          isAdmin={user?.role === 'admin'}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          </TabsContent>
        </Tabs>
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

      <ManualTripModal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekräfta radering</AlertDialogTitle>
            <AlertDialogDescription>
              Denna resa kommer att markeras som raderad och döljas från alla vyer. 
              Åtgärden sparas i ändringsloggen för revision. Vill du fortsätta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Markera som raderad
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}