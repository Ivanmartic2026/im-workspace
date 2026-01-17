import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Calendar, MapPin, Clock, AlertTriangle, CheckCircle, Car, Download, RefreshCw, Loader2, BarChart3, Settings, FileDown, Users, Sparkles, Search, ArrowUpDown, ArrowUp, ArrowDown, List, LayoutGrid, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import JournalEntryCard from "@/components/journal/JournalEntryCard";
import JournalStatsCard from "@/components/journal/JournalStatsCard";
import EditJournalModal from "@/components/journal/EditJournalModal";
import ManualTripModal from "@/components/journal/ManualTripModal";
import SuggestionsView from "@/components/journal/SuggestionsView";
import QuickApproveCard from "@/components/journal/QuickApproveCard";

export default function DrivingJournal() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
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
    setActiveTab('suggestions');

    try {
      const response = await base44.functions.invoke('analyzeTrips', {
        entryIds: entriesToAnalyze.map(e => e.id)
      });

      setAiSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Error analyzing trips:', error);
      alert('Kunde inte analysera resor med AI: ' + error.message);
      setActiveTab('pending');
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
      setActiveTab('pending');
    }
  };

  const handleRejectSuggestion = (entryId) => {
    setAiSuggestions(prev => prev.filter(s => s.entryId !== entryId));
    
    if (aiSuggestions.length <= 1) {
      setActiveTab('pending');
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
      setActiveTab('pending');
    }
  };

  const handleProcessDrafts = async () => {
    setProcessingDrafts(true);
    try {
      const response = await base44.functions.invoke('autoProcessJournal', {});
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      
      if (response.data.results.suggestions > 0) {
        alert(`${response.data.results.suggestions} resor har fått AI-förslag. Granska dem under "Utkast"-fliken.`);
        setActiveTab('drafts');
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

  // Filter entries
  const draftEntries = entries.filter(entry => 
    entry.suggested_classification && 
    entry.trip_type !== 'väntar' && 
    entry.status === 'pending_review' &&
    (user?.role === 'admin' || entry.driver_email === user?.email)
  );

  const filteredEntries = entries.filter(entry => {
    const matchesTab = user?.role === 'admin' 
      ? (activeTab === 'pending' ? (entry.status === 'pending_review' || entry.status === 'submitted') && !entry.suggested_classification :
         activeTab === 'drafts' ? entry.suggested_classification && entry.status === 'pending_review' :
         activeTab === 'approved' ? entry.status === 'approved' :
         activeTab === 'all' ? true : false)
      : (activeTab === 'pending' ? (entry.status === 'pending_review' || entry.status === 'requires_info') && entry.trip_type === 'väntar' :
         activeTab === 'drafts' ? entry.suggested_classification && entry.status === 'pending_review' :
         activeTab === 'submitted' ? entry.status === 'submitted' :
         activeTab === 'approved' ? entry.status === 'approved' : false);
    
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
              <Button 
                size="sm" 
                variant={viewMode === 'table' ? 'default' : 'outline'}
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setShowManualModal(true)}
                size="sm"
                variant="outline"
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
              </Button>
              {user?.role === 'admin' && (
                <>
                  <Link to={createPageUrl('AllVehicles')}>
                    <Button size="sm" variant="outline" title="Visa alla GPS-enheter">
                      <Car className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to={createPageUrl('JournalPolicySettings')}>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
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

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Sök fordon, förare, projekt, kund..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-slate-200"
            />
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              {selectedPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label className="text-xs mb-1 block">Från datum</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Till datum</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Idag</SelectItem>
                    <SelectItem value="week">Denna vecka</SelectItem>
                    <SelectItem value="month">Denna månad</SelectItem>
                    <SelectItem value="custom">Anpassat intervall</SelectItem>
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

                {user?.role === 'admin' && (
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj medarbetare" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla medarbetare</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.user_email} value={emp.user_email}>
                          {emp.user_email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Export Buttons */}
              {user?.role === 'admin' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={exportLoading}
                    className="flex-1"
                  >
                    {exportLoading ? (
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="h-3 w-3 mr-2" />
                    )}
                    Export PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={exportLoading}
                    className="flex-1"
                  >
                    {exportLoading ? (
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="h-3 w-3 mr-2" />
                    )}
                    Export CSV
                  </Button>
                </div>
              )}
              </CardContent>
              </Card>

              {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="w-full bg-white shadow-sm grid grid-cols-5">
              {user?.role === 'admin' ? (
                <>
                  <TabsTrigger value="pending" className="flex-col gap-1 py-3">
                    <span>Väntande</span>
                    {stats.pending > 0 && (
                      <Badge className="bg-amber-500 text-white text-xs px-2 py-0 h-5">{stats.pending}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="drafts">
                    Utkast
                    {draftEntries.length > 0 && (
                      <Badge className="ml-1 bg-indigo-500 text-xs">{draftEntries.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="suggestions">
                    AI-analys
                    {aiSuggestions.length > 0 && (
                      <Badge className="ml-1 bg-purple-500 text-xs">{aiSuggestions.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="flex-col gap-1 py-3">
                    <span>Godkända</span>
                    <Badge className="bg-emerald-500 text-white text-xs px-2 py-0 h-5">{stats.approved}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="all" className="flex-col gap-1 py-3">
                    <span>Alla</span>
                    <Badge className="bg-slate-500 text-white text-xs px-2 py-0 h-5">{stats.total}</Badge>
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="pending">
                    Att fylla i
                    {entries.filter(e => (e.status === 'pending_review' || e.status === 'requires_info') && e.driver_email === user?.email && e.trip_type === 'väntar').length > 0 && (
                      <Badge className="ml-1 bg-amber-500 text-xs">
                        {entries.filter(e => (e.status === 'pending_review' || e.status === 'requires_info') && e.driver_email === user?.email && e.trip_type === 'väntar').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="drafts">
                    Utkast
                    {draftEntries.length > 0 && (
                      <Badge className="ml-1 bg-indigo-500 text-xs">{draftEntries.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="suggestions">
                    AI-analys
                    {aiSuggestions.length > 0 && (
                      <Badge className="ml-1 bg-purple-500 text-xs">{aiSuggestions.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="submitted">Inskickade</TabsTrigger>
                  <TabsTrigger value="approved">Godkända</TabsTrigger>
                </>
              )}
            </TabsList>
          </Tabs>

          {/* Drafts Tab */}
          {activeTab === 'drafts' ? (
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
          ) : activeTab === 'suggestions' ? (
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
              {activeTab === 'pending' && filteredEntries.some(e => e.trip_type === 'väntar') && (
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
                    : activeTab === 'pending' 
                    ? 'Inga väntande körjournaler just nu' 
                    : 'Inga resor hittades för denna period'}
                </p>
                {entries.length === 0 && user?.role === 'admin' && (
                  <div className="text-xs text-slate-500 space-y-2">
                    <p>För att få körjournalsposter:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Se till att fordon har GPS Device ID</li>
                      <li>Välj ett specifikt fordon och klicka synkronisera-knappen</li>
                      <li>Eller använd "Registrera" i GPS-vyn för att lägga till resor manuellt</li>
                    </ul>
                  </div>
                )}
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
                  isAdmin={user?.role === 'admin'}
                />
              ))}
            </div>
          )}
            </>
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

      <ManualTripModal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
        }}
      />
    </div>
  );
}