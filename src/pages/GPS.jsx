import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Gauge, Clock, Calendar, Loader2, Car } from "lucide-react";
import { format, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function GPS() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: gpsDevices, isLoading: devicesLoading } = useQuery({
    queryKey: ['gps-devices'],
    queryFn: async () => {
      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getDeviceList'
      });
      return response.data;
    },
  });

  const allDevices = gpsDevices?.records || [];
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
    enabled: allDevices.length > 0,
    refetchInterval: 30000,
  });

  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['gps-all-trips', selectedPeriod, allDevices],
    queryFn: async () => {
      if (allDevices.length === 0) return null;

      const today = new Date();
      const startDate = selectedPeriod === 'today' ? today : subDays(today, 7);
      
      const promises = allDevices.map(device => 
        base44.functions.invoke('gpsTracking', {
          action: 'getTrips',
          params: {
            deviceId: device.deviceid,
            begintime: format(startDate, 'yyyy-MM-dd') + ' 00:00:00',
            endtime: format(today, 'yyyy-MM-dd') + ' 23:59:59'
          }
        })
      );

      const results = await Promise.all(promises);
      return results.map((r, i) => ({ deviceId: allDevices[i].deviceid, deviceName: allDevices[i].devicename, data: r.data }));
    },
    enabled: allDevices.length > 0,
  });

  if (devicesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">GPS Spårning</h1>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (allDevices.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">GPS Spårning</h1>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga GPS-enheter hittades</h3>
              <p className="text-slate-500">Kontrollera att dina GPS-enheter är kopplade till ditt konto.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const positions = positionsData?.records || [];
  const centerPos = positions[0] ? [positions[0].callat, positions[0].callon] : [59.3293, 18.0686];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-6">GPS Spårning</h1>

          {/* Map */}
          <Card className="border-0 shadow-sm overflow-hidden mb-6">
            <div className="h-96">
              <MapContainer
                center={centerPos}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {positions.map((pos) => {
                  const vehicle = vehiclesWithGPS.find(v => v.gps_device_id === pos.deviceid);
                  const device = allDevices.find(d => d.deviceid === pos.deviceid);
                  
                  return (
                    <Marker key={pos.deviceid} position={[pos.callat, pos.callon]}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-semibold">
                            {vehicle?.registration_number || device?.devicename || pos.deviceid}
                          </p>
                          {vehicle && (
                            <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                          )}
                          <p className="text-xs text-slate-600 mt-1">
                            {Math.round(pos.speed * 3.6)} km/h
                          </p>
                          {vehicle && (
                            <Link to={createPageUrl('VehicleTracking') + `?id=${vehicle.id}`}>
                              <button className="text-xs text-blue-600 mt-1 hover:underline">
                                Visa detaljer
                              </button>
                            </Link>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </Card>

          {/* Period Selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedPeriod('today')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedPeriod === 'today'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Idag
            </button>
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedPeriod === 'week'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Senaste veckan
            </button>
          </div>

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
                if (!deviceTrips.data.totaltrips?.length) return null;

                const totalDistance = deviceTrips.data.totaldistance / 1000;
                const totalTime = deviceTrips.data.totaltriptime / (1000 * 60);
                const tripCount = deviceTrips.data.totaltrips.length;

                const displayName = vehicle?.registration_number || deviceTrips.deviceName || deviceTrips.deviceId;
                const displaySubtext = vehicle ? `${vehicle.make} ${vehicle.model}` : 'GPS Enhet';

                return (
                  <Card key={deviceTrips.deviceId} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{displayName}</h3>
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
        </motion.div>
      </div>
    </div>
  );
}