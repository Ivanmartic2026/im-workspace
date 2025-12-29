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

      const startTime = new Date(startDate + 'T00:00:00').getTime() / 1000;
      const endTime = new Date(endDate + 'T23:59:59').getTime() / 1000;

      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getTrackHistory',
        params: {
          deviceId: vehicle.gps_device_id,
          startTime,
          endTime
        }
      });

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

      setRouteData({
        vehicle,
        routePoints,
        startPoint,
        endPoint,
        totalPoints: tracks.length,
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
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Fordon:</span>
                  <span className="font-semibold">{routeData.vehicle.registration_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Datapunkter:</span>
                  <span className="font-semibold">{routeData.totalPoints}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Start:</span>
                  <span className="font-semibold text-xs">{format(routeData.startTime, 'PPp', { locale: sv })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Slut:</span>
                  <span className="font-semibold text-xs">{format(routeData.endTime, 'PPp', { locale: sv })}</span>
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