import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Clock, Circle, Loader2, Eye, Route } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AllVehicles() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list(),
  });

  const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);
  const allDeviceIds = vehiclesWithGPS.map(v => v.gps_device_id);

  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['gps-all-positions', allDeviceIds],
    queryFn: async () => {
      if (allDeviceIds.length === 0) return null;
      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getLastPosition',
        params: { deviceIds: allDeviceIds }
      });
      return response.data;
    },
    enabled: allDeviceIds.length > 0,
    refetchInterval: 60000,
  });

  const positions = positionsData?.records || [];

  const getVehiclePosition = (vehicle) => {
    return positions.find(p => p.deviceid === vehicle.gps_device_id);
  };

  const getVehicleStatus = (vehicle) => {
    if (!vehicle.gps_device_id) return 'Ingen GPS';
    const position = getVehiclePosition(vehicle);
    if (!position) return 'Okänd';
    
    const lastUpdate = new Date(position.updatetime);
    const now = new Date();
    const minutesSince = (now - lastUpdate) / (1000 * 60);
    
    if (minutesSince < 5) return 'Aktiv';
    if (minutesSince < 30) return 'Nyligen aktiv';
    return 'Inaktiv';
  };

  const getVehicleTripsCount = (vehicle) => {
    return journalEntries.filter(e => e.vehicle_id === vehicle.id).length;
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || vehicle.vehicle_type === typeFilter;
    
    const vehicleStatus = getVehicleStatus(vehicle);
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && vehicleStatus === 'Aktiv') ||
      (statusFilter === 'recent' && vehicleStatus === 'Nyligen aktiv') ||
      (statusFilter === 'inactive' && vehicleStatus === 'Inaktiv') ||
      (statusFilter === 'no-gps' && vehicleStatus === 'Ingen GPS');
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aktiv': return 'text-emerald-600 bg-emerald-50';
      case 'Nyligen aktiv': return 'text-amber-600 bg-amber-50';
      case 'Inaktiv': return 'text-slate-500 bg-slate-100';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Alla Fordon</h1>
            <p className="text-sm text-slate-500 mt-1">
              {filteredVehicles.length} av {vehicles.length} fordon
            </p>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Sök reg.nr, märke, modell..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla statusar</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="recent">Nyligen aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                    <SelectItem value="no-gps">Ingen GPS</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Fordonstyp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla typer</SelectItem>
                    <SelectItem value="personbil">Personbil</SelectItem>
                    <SelectItem value="lätt lastbil">Lätt lastbil</SelectItem>
                    <SelectItem value="lastbil">Lastbil</SelectItem>
                    <SelectItem value="skåpbil">Skåpbil</SelectItem>
                    <SelectItem value="annat">Annat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {vehiclesLoading || positionsLoading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
                <p className="text-sm text-slate-500 mt-4">Hämtar fordonsdata...</p>
              </CardContent>
            </Card>
          ) : filteredVehicles.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Inga fordon hittades</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-slate-600">Reg.nr</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-600">Fordonstyp</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-600">Resor</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-600">Senast sedd</th>
                      <th className="text-left p-4 text-xs font-semibold text-slate-600">Status</th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-600">Åtgärd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((vehicle) => {
                      const position = getVehiclePosition(vehicle);
                      const status = getVehicleStatus(vehicle);
                      const tripsCount = getVehicleTripsCount(vehicle);
                      
                      return (
                        <tr key={vehicle.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-slate-900">{vehicle.registration_number}</p>
                              <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-slate-700 capitalize">{vehicle.vehicle_type || 'Ej angiven'}</p>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <Route className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-medium text-slate-700">{tripsCount}</span>
                              <span className="text-xs text-slate-500">resor</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {position ? (
                              <div>
                                <div className="flex items-center gap-1 text-sm text-slate-700 mb-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{position.callat?.toFixed(4)}, {position.callon?.toFixed(4)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(position.updatetime), 'dd MMM, HH:mm', { locale: sv })}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">Ingen data</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                              <Circle className="h-2 w-2 fill-current" />
                              {status}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {vehicle.gps_device_id ? (
                              <Link to={createPageUrl('VehicleTracking') + `?id=${vehicle.id}`}>
                                <Button size="sm" variant="outline" className="gap-2">
                                  <Eye className="h-3 w-3" />
                                  Se detaljer
                                </Button>
                              </Link>
                            ) : (
                              <Link to={createPageUrl('VehicleDetails') + `?id=${vehicle.id}`}>
                                <Button size="sm" variant="outline" className="gap-2">
                                  <Eye className="h-3 w-3" />
                                  Se fordon
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}