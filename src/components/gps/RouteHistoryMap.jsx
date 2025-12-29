import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Navigation, Clock } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function RouteHistoryMap({ vehicles }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [error, setError] = useState(null);

  const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);

  const handleLoadRoute = async () => {
    if (!selectedVehicle) {
      alert('Välj ett fordon');
      return;
    }

    setLoading(true);
    setError(null);
    setRouteData(null);

    try {
      const vehicle = vehicles.find(v => v.id === selectedVehicle);
      if (!vehicle?.gps_device_id) {
        throw new Error('Fordon saknar GPS-enhet');
      }

      const startTime = Math.floor(new Date(startDate + 'T00:00:00').getTime() / 1000);
      const endTime = Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000);

      console.log('Fetching route:', { deviceId: vehicle.gps_device_id, startTime, endTime });

      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getTrackHistory',
        params: {
          deviceId: vehicle.gps_device_id,
          startTime,
          endTime
        }
      });

      console.log('GPS Route response:', response.data);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (response.data?.status !== 0) {
        throw new Error(response.data?.cause || 'Kunde inte hämta ruttdata');
      }

      const tracks = response.data?.tracks || [];
      if (tracks.length === 0) {
        setError('Inga rutter hittades för vald period');
        setLoading(false);
        return;
      }

      // Process track data
      const routePoints = tracks.map(point => [point.lat, point.lon]);
      const startPoint = tracks[0];
      const endPoint = tracks[tracks.length - 1];

      // Calculate total distance
      let totalDistance = 0;
      for (let i = 1; i < tracks.length; i++) {
        const prev = tracks[i - 1];
        const curr = tracks[i];
        const distance = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        totalDistance += distance;
      }

      // Calculate duration
      const durationMs = (endPoint.time - startPoint.time) * 1000;
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      setRouteData({
        vehicle,
        routePoints,
        startPoint,
        endPoint,
        totalPoints: tracks.length,
        totalDistance: totalDistance.toFixed(1),
        duration: durationMinutes,
        startTime: new Date(startPoint.time * 1000),
        endTime: new Date(endPoint.time * 1000)
      });

    } catch (err) {
      console.error('Error loading route:', err);
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <Label>Välj fordon</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj fordon..." />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesWithGPS.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} - {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Från datum</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Till datum</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleLoadRoute}
              disabled={loading || !selectedVehicle}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Laddar rutt...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Visa historisk rutt
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-0 shadow-sm bg-rose-50 border-rose-200">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-rose-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {routeData && (
        <>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Ruttinformation</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-600">Fordon:</span>
                  <span className="font-semibold">{routeData.vehicle.registration_number}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Navigation className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">Total sträcka</span>
                    </div>
                    <p className="text-lg font-bold text-blue-900">{routeData.totalDistance} km</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-600 font-medium">Total tid</span>
                    </div>
                    <p className="text-lg font-bold text-purple-900">
                      {routeData.duration < 60 ? `${routeData.duration} min` : `${Math.floor(routeData.duration / 60)}h ${routeData.duration % 60}m`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Start:</span>
                    <span className="font-medium text-xs">{format(routeData.startTime, 'PPp', { locale: sv })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Slut:</span>
                    <span className="font-medium text-xs">{format(routeData.endTime, 'PPp', { locale: sv })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Datapunkter:</span>
                    <span className="font-medium">{routeData.totalPoints}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="h-[500px]">
              <MapContainer
                center={routeData.routePoints[0]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                
                <Polyline
                  positions={routeData.routePoints}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.7}
                />

                <Marker position={[routeData.startPoint.lat, routeData.startPoint.lon]} icon={startIcon}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold text-green-700">Start</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {format(routeData.startTime, 'PPp', { locale: sv })}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                <Marker position={[routeData.endPoint.lat, routeData.endPoint.lon]} icon={endIcon}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold text-rose-700">Slut</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {format(routeData.endTime, 'PPp', { locale: sv })}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}