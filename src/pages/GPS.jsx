import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Navigation, Gauge, Clock, Calendar, Loader2, Car, Route, History } from "lucide-react";
import { format, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import GPSTripHistory from '@/components/gps/GPSTripHistory';
import VehicleStatusBadge from '@/components/gps/VehicleStatusBadge';
import GeofenceAlerts from '@/components/gps/GeofenceAlerts';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function GPS() {
  const [activeTab, setActiveTab] = useState('live');

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: gpsDevices, isLoading: devicesLoading, error: devicesError } = useQuery({
    queryKey: ['gps-devices'],
    queryFn: async () => {
      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getDeviceList',
        params: {}
      });
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      
      if (response.data?.status !== 0) {
        throw new Error(response.data?.cause || 'Kunde inte hämta GPS-enheter');
      }
      
      return response.data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 30000),
    staleTime: 60000, // Cache i 1 minut
  });

  // Extract devices from all groups
  const allDevices = gpsDevices?.groups?.flatMap(group => group.devices || []) || [];
  const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);

  const { data: positionsData, isLoading: positionsLoading } = useQuery({
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
    enabled: allDevices.length > 0 && activeTab === 'live',
    refetchInterval: 30000, // Realtidsuppdateringar var 30:e sekund
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['gps-latest-trips', allDevices],
    queryFn: async () => {
      if (allDevices.length === 0) return null;

      const now = new Date();
      const last3Hours = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // 3 timmar tillbaka
      
      const promises = allDevices.map(device => {
        return base44.functions.invoke('gpsTracking', {
          action: 'getTrips',
          params: {
            deviceId: device.deviceid,
            begintime: Math.floor(last3Hours.getTime() / 1000),
            endtime: Math.floor(now.getTime() / 1000)
          }
        }).catch(error => {
          console.error(`Failed to fetch trips for device ${device.deviceid}:`, error);
          return { data: { totaltrips: [] } };
        });
      });

      const results = await Promise.all(promises);
      
      // Filtrera och behåll endast senaste 3 resorna per enhet
      return results.map((r, i) => {
        const trips = r.data.totaltrips || [];
        const sortedTrips = trips.sort((a, b) => new Date(b.begintime) - new Date(a.begintime)).slice(0, 3);
        
        return {
          deviceId: allDevices[i].deviceid,
          deviceName: allDevices[i].devicename,
          data: {
            ...r.data,
            totaltrips: sortedTrips,
            totaldistance: sortedTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0),
            totaltriptime: sortedTrips.reduce((sum, trip) => sum + (trip.duration || 0), 0)
          }
        };
      });
    },
    enabled: allDevices.length > 0 && activeTab === 'live',
    refetchInterval: 60000, // Uppdatera var 60:e sekund
  });

  if (devicesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">GPS Spårning</h1>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
              <p className="text-sm text-slate-500 mt-4">Hämtar GPS-enheter...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (devicesError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">GPS Spårning</h1>
          <Card className="border-0 shadow-sm bg-rose-50 border-l-4 border-l-rose-500">
            <CardContent className="p-12 text-center">
              <MapPin className="h-16 w-16 text-rose-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-rose-900 mb-2">Kunde inte hämta GPS-enheter</h3>
              <p className="text-rose-700 text-sm mb-2">
                {devicesError.message || 'Ett okänt fel uppstod'}
              </p>
              <p className="text-slate-600 text-xs mt-4">
                Kontrollera att GPS-inloggningsuppgifter är korrekta i inställningarna.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!gpsDevices || allDevices.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">GPS Spårning</h1>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga GPS-enheter hittades</h3>
              <p className="text-slate-500 text-sm mb-2">Kontrollera att dina GPS-enheter är kopplade till ditt konto.</p>
              {gpsDevices && (
                <p className="text-xs text-slate-400 mt-4">
                  API-svar: {JSON.stringify(gpsDevices).substring(0, 100)}...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const positions = positionsData?.records || [];
  const centerPos = positions[0] ? [positions[0].callat, positions[0].callon] : [59.3293, 18.0686];

  // Beräkna status för fordon baserat på hastighet
  const getVehicleStatus = (speed) => {
    const speedKmh = speed * 3.6;
    if (speedKmh > 5) return 'kör';
    if (speedKmh > 0) return 'långsamt';
    return 'parkerad';
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
              <h1 className="text-2xl font-bold text-slate-900">GPS Spårning</h1>
              <p className="text-sm text-slate-500 mt-1">
                {vehiclesWithGPS.length} fordon med GPS live
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl('AllVehicles')}>
                <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  <Car className="h-4 w-4" />
                  Alla fordon
                </button>
              </Link>
              <Link to={createPageUrl('DrivingJournal')}>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
                  <Route className="h-4 w-4" />
                  Körjournal
                </button>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="w-full bg-white shadow-sm">
              <TabsTrigger value="live" className="flex-1">
                <Navigation className="h-4 w-4 mr-2" />
                Live
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                <History className="h-4 w-4 mr-2" />
                Historik
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'history' ? (
            <GPSTripHistory vehicles={vehicles} />
          ) : (
            <>
          {/* Geofence Alerts */}
          <GeofenceAlerts positions={positions} vehicles={vehiclesWithGPS} />

          {/* Map */}
          <Card className="border-0 shadow-sm overflow-hidden mb-6">
            <div className="h-[500px]">
              {positionsLoading ? (
                <div className="h-full flex items-center justify-center bg-slate-50">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : positions.length > 0 ? (
                <MapContainer
                  center={centerPos}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                  dragging={true}
                  touchZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {positions.map((pos) => {
                    const vehicle = vehiclesWithGPS.find(v => v.gps_device_id === pos.deviceid);
                    const device = allDevices.find(d => d.deviceid === pos.deviceid);
                    const displayName = vehicle?.registration_number || device?.devicename || pos.deviceid;
                    const status = getVehicleStatus(pos.speed);
                    
                    return (
                      <Marker key={pos.deviceid} position={[pos.callat, pos.callon]}>
                        <Tooltip permanent direction="top" offset={[0, -20]}>
                          <div className="font-semibold text-xs flex items-center gap-1">
                            <VehicleStatusBadge status={status} />
                            {displayName}
                          </div>
                        </Tooltip>
                        <Popup>
                          <div className="min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Car className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-base">
                                  {vehicle?.registration_number || device?.devicename || pos.deviceid}
                                </p>
                                {vehicle && (
                                  <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                                )}
                                {vehicle?.assigned_driver && (
                                  <p className="text-xs text-slate-500">Förare: {vehicle.assigned_driver}</p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1 mb-2 py-2 border-t border-slate-100">
                              <p className="text-sm text-slate-600 flex items-center gap-1">
                                <Gauge className="h-3 w-3" />
                                <span className="font-medium">{Math.round(pos.speed * 3.6)} km/h</span>
                                <VehicleStatusBadge status={status} />
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {pos.posiTime ? format(new Date(pos.posiTime * 1000), 'PPp', { locale: sv }) : 'Ingen tid'}
                              </p>
                            </div>
                            {vehicle && (
                              <Link to={createPageUrl('VehicleTracking') + `?id=${vehicle.id}`}>
                                <button className="w-full text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                                  Visa fordonsdetaljer →
                                </button>
                              </Link>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-slate-50">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">Ingen position tillgänglig</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Trips Summary */}
          {tripsLoading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tripsData?.map((deviceTrips) => {
                const vehicle = vehiclesWithGPS.find(v => v.gps_device_id === deviceTrips.deviceId);
                const currentPos = positions.find(p => p.deviceid === deviceTrips.deviceId);
                const status = currentPos ? getVehicleStatus(currentPos.speed) : 'okänd';

                if (!deviceTrips?.data?.totaltrips?.length) return null;

                const totalDistance = (deviceTrips.data.totaldistance || 0) / 1000;
                const totalTime = (deviceTrips.data.totaltriptime || 0) / (1000 * 60);
                const tripCount = deviceTrips.data.totaltrips.length;

                const displayName = vehicle?.registration_number || deviceTrips.deviceName || deviceTrips.deviceId;
                const displaySubtext = vehicle ? `${vehicle.make} ${vehicle.model}` : 'GPS Enhet';

                return (
                  <Card key={deviceTrips.deviceId} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                       <div className="flex items-start justify-between mb-3">
                         <div>
                           <div className="flex items-center gap-2">
                             <h3 className="font-semibold text-slate-900">{displayName}</h3>
                             {currentPos && <VehicleStatusBadge status={status} />}
                           </div>
                           <p className="text-xs text-slate-500">{displaySubtext}</p>
                         </div>
                         <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                           {tripCount} {tripCount === 1 ? 'resa' : 'resor'}
                         </Badge>
                       </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">{totalDistance.toFixed(1)} km</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">{Math.round(totalTime)} min</span>
                        </div>
                      </div>
                      {vehicle && (
                        <Link to={createPageUrl('VehicleTracking') + `?id=${vehicle.id}`} className="block mt-3">
                          <button className="text-xs text-blue-600 hover:underline">
                            Visa fordonsdetaljer →
                          </button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}