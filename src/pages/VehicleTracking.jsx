import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Navigation, Gauge, Clock, Fuel, Activity, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function VehicleTracking() {
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');
  const [selectedTab, setSelectedTab] = useState('position');

  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      const vehicles = await base44.entities.Vehicle.filter({ id: vehicleId });
      return vehicles[0];
    },
    enabled: !!vehicleId,
  });

  const { data: positionData, isLoading: positionLoading, refetch: refetchPosition } = useQuery({
    queryKey: ['gps-position', vehicle?.gps_device_id],
    queryFn: async () => {
      if (!vehicle?.gps_device_id) return null;
      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getLastPosition',
        params: { deviceIds: [vehicle.gps_device_id] }
      });
      return response.data;
    },
    enabled: !!vehicle?.gps_device_id,
    refetchInterval: 30000, // Uppdatera var 30:e sekund
  });

  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['gps-trips', vehicle?.gps_device_id],
    queryFn: async () => {
      if (!vehicle?.gps_device_id) return null;
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getTrips',
        params: {
          deviceId: vehicle.gps_device_id,
          begintime: `${today} 00:00:00`,
          endtime: `${today} 23:59:59`
        }
      });
      return response.data;
    },
    enabled: !!vehicle?.gps_device_id && selectedTab === 'trips',
  });

  const { data: monthTripsData, isLoading: monthTripsLoading } = useQuery({
    queryKey: ['gps-month-trips', vehicle?.gps_device_id],
    queryFn: async () => {
      if (!vehicle?.gps_device_id) return null;
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getTrips',
        params: {
          deviceId: vehicle.gps_device_id,
          begintime: format(firstDay, 'yyyy-MM-dd') + ' 00:00:00',
          endtime: format(lastDay, 'yyyy-MM-dd') + ' 23:59:59'
        }
      });
      return response.data;
    },
    enabled: !!vehicle?.gps_device_id && selectedTab === 'month',
  });

  if (vehicleLoading || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!vehicle.gps_device_id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
        <div className="max-w-2xl mx-auto">
          <Link to={createPageUrl('VehicleDetails') + `?id=${vehicleId}`}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Ingen GPS kopplad</h3>
              <p className="text-slate-500 mb-6">Detta fordon har inget GPS Device ID registrerat.</p>
              <Link to={createPageUrl('EditVehicle') + `?id=${vehicleId}`}>
                <Button>Lägg till GPS Device ID</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const position = positionData?.records?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to={createPageUrl('VehicleDetails') + `?id=${vehicleId}`}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">GPS Spårning</h1>
              <p className="text-sm text-slate-500 mt-1">{vehicle.registration_number}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchPosition()}
            >
              <Activity className="h-4 w-4 mr-2" />
              Uppdatera
            </Button>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-2xl grid grid-cols-3">
              <TabsTrigger value="position" className="rounded-xl data-[state=active]:shadow-sm">
                Position
              </TabsTrigger>
              <TabsTrigger value="trips" className="rounded-xl data-[state=active]:shadow-sm">
                Idag
              </TabsTrigger>
              <TabsTrigger value="month" className="rounded-xl data-[state=active]:shadow-sm">
                Månad
              </TabsTrigger>
            </TabsList>

            <TabsContent value="position" className="mt-6 space-y-4">
              {positionLoading ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
                  </CardContent>
                </Card>
              ) : position ? (
                <>
                  {/* Karta */}
                  <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-80">
                      <MapContainer
                        center={[position.callat, position.callon]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; OpenStreetMap contributors'
                        />
                        <Marker position={[position.callat, position.callon]}>
                          <Popup>
                            <div className="text-center">
                              <p className="font-semibold">{vehicle.registration_number}</p>
                              <p className="text-xs text-slate-500">{position.strstatus}</p>
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </Card>

                  {/* Position Info */}
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      <h3 className="font-semibold text-slate-900">Aktuell position</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Gauge className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Hastighet</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {Math.round(position.speed * 3.6)} km/h
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Navigation className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Riktning</p>
                            <p className="text-sm font-semibold text-slate-900">{position.course}°</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Status</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {position.moving ? 'I rörelse' : 'Stillastående'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Senast uppdaterad</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {format(new Date(position.updatetime), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Total körsträcka</span>
                          <span className="font-semibold text-slate-900">
                            {(position.totaldistance / 1000).toFixed(1)} km
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Ingen GPS-data tillgänglig</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="trips" className="mt-6 space-y-3">
              {tripsLoading ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
                  </CardContent>
                </Card>
              ) : tripsData?.totaltrips?.length > 0 ? (
                <>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Total sträcka</p>
                          <p className="text-lg font-bold text-slate-900">
                            {(tripsData.totaldistance / 1000).toFixed(1)} km
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Total tid</p>
                          <p className="text-lg font-bold text-slate-900">
                            {Math.round(tripsData.totaltriptime / (1000 * 60))} min
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Max hastighet</p>
                          <p className="text-lg font-bold text-slate-900">
                            {Math.round(tripsData.totalmaxspeed * 3.6)} km/h
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {tripsData.totaltrips.map((trip, idx) => (
                    <Card key={idx} className="border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {format(new Date(trip.starttime), 'HH:mm')} - {format(new Date(trip.endtime), 'HH:mm')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {Math.round(trip.triptime / (1000 * 60))} minuter
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">
                              {(trip.tripdistance / 1000).toFixed(1)} km
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            <span>Snitt: {Math.round(trip.averagespeed * 3.6)} km/h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>Max: {Math.round(trip.maxspeed * 3.6)} km/h</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Navigation className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Inga resor registrerade idag</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="month" className="mt-6 space-y-3">
              {monthTripsLoading ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
                  </CardContent>
                </Card>
              ) : monthTripsData?.totaltrips?.length > 0 ? (
                <>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Total sträcka</p>
                          <p className="text-lg font-bold text-slate-900">
                            {(monthTripsData.totaldistance / 1000).toFixed(1)} km
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Total tid</p>
                          <p className="text-lg font-bold text-slate-900">
                            {Math.round(monthTripsData.totaltriptime / (1000 * 60 * 60))} tim
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Antal resor</p>
                          <p className="text-lg font-bold text-slate-900">
                            {monthTripsData.totaltrips.length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {monthTripsData.totaltrips.slice(0, 20).map((trip, idx) => (
                    <Card key={idx} className="border-0 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {format(new Date(trip.starttime), 'dd MMM, HH:mm', { locale: sv })} - {format(new Date(trip.endtime), 'HH:mm', { locale: sv })}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {Math.round(trip.triptime / (1000 * 60))} minuter
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">
                              {(trip.tripdistance / 1000).toFixed(1)} km
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            <span>Snitt: {Math.round(trip.averagespeed * 3.6)} km/h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>Max: {Math.round(trip.maxspeed * 3.6)} km/h</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {monthTripsData.totaltrips.length > 20 && (
                    <Card className="border-0 shadow-sm bg-slate-50">
                      <CardContent className="p-4 text-center text-sm text-slate-500">
                        Visar 20 av {monthTripsData.totaltrips.length} resor denna månad
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Inga resor registrerade denna månad</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}