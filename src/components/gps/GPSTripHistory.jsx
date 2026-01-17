import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { Loader2, Car, ArrowUpDown, ArrowUp, ArrowDown, Route, Clock, MapPin, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const getTripGeoJSON = (trip) => {
  if (!trip || !trip.points) return null;
  try {
    return JSON.parse(trip.points);
  } catch (e) {
    console.error("Failed to parse trip GeoJSON:", e);
    return null;
  }
};

export default function GPSTripHistory({ vehicles }) {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sortField, setSortField] = useState('start_time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);

  useEffect(() => {
    if (vehiclesWithGPS.length > 0 && !selectedVehicle) {
      setSelectedVehicle(vehiclesWithGPS[0].id);
    }
  }, [vehiclesWithGPS, selectedVehicle]);

  const currentVehicle = vehicles.find(v => v.id === selectedVehicle);
  const currentVehicleGPSId = currentVehicle?.gps_device_id;

  const { data: gpsTripsData, isLoading: tripsLoading, error: tripsError } = useQuery({
    queryKey: ['gps-history-trips', currentVehicleGPSId, selectedPeriod, customStartDate, customEndDate],
    queryFn: async () => {
      if (!currentVehicleGPSId) return { totaltrips: [] };

      let startDate, endDate;
      const now = new Date();

      if (selectedPeriod === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
      } else if (selectedPeriod === 'week') {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
      } else if (selectedPeriod === 'month') {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      } else if (selectedPeriod === 'custom') {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = subDays(now, 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.setHours(23, 59, 59, 999));
      }

      const response = await base44.functions.invoke('gpsTracking', {
        action: 'getTrips',
        params: {
          deviceId: currentVehicleGPSId,
          begintime: Math.floor(startDate.getTime() / 1000),
          endtime: Math.floor(endDate.getTime() / 1000)
        }
      });
      return response.data; 
    },
    enabled: !!currentVehicleGPSId,
    staleTime: 5 * 60 * 1000,
  });

  const trips = gpsTripsData?.totaltrips || [];

  const sortedTrips = [...trips].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'start_time':
        aVal = parseISO(a.begintime || new Date(0).toISOString()).getTime();
        bVal = parseISO(b.begintime || new Date(0).toISOString()).getTime();
        break;
      case 'distance_km':
        aVal = a.distance / 1000 || 0;
        bVal = b.distance / 1000 || 0;
        break;
      case 'duration_minutes':
        aVal = a.duration / 60 || 0;
        bVal = b.duration / 60 || 0;
        break;
      default:
        return 0;
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 ml-1" /> : 
      <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getDurationString = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) return `${hours}t ${remainingMinutes}m`;
    return `${minutes}m`;
  };

  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance / 1000 || 0), 0);
  const totalDuration = trips.reduce((sum, trip) => sum + (trip.duration / 60 || 0), 0);

  const mapCenter = selectedTrip && selectedTrip.beginposition
    ? [selectedTrip.beginposition.y, selectedTrip.beginposition.x]
    : [59.3293, 18.0686];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Fordon</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj fordon" />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesWithGPS.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} ({v.make} {v.model})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Idag</SelectItem>
                  <SelectItem value="week">Denna vecka</SelectItem>
                  <SelectItem value="month">Denna månad</SelectItem>
                  <SelectItem value="custom">Anpassat intervall</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Från datum</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Till datum</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {trips.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Route className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{trips.length}</p>
                  <p className="text-xs text-slate-500">Resor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{totalDistance.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">km totalt</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{Math.round(totalDuration)}</p>
                  <p className="text-xs text-slate-500">min totalt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!currentVehicleGPSId && (
        <Card className="border-0 shadow-sm bg-blue-50 border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Inget GPS-ID kopplat</h3>
              <p className="text-sm text-blue-700">Välj ett fordon med ett kopplat GPS Device ID för att se historik.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {tripsLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 mt-4">Hämtar resor...</p>
          </CardContent>
        </Card>
      ) : tripsError ? (
        <Card className="border-0 shadow-sm bg-rose-50 border-l-4 border-l-rose-500">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-rose-600" />
            <div>
              <h3 className="font-semibold text-rose-900">Kunde inte hämta resor</h3>
              <p className="text-sm text-rose-700">{tripsError.message || 'Ett okänt fel uppstod vid hämtning av resor.'}</p>
            </div>
          </CardContent>
        </Card>
      ) : sortedTrips.length === 0 && currentVehicleGPSId ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Route className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-lg font-semibold text-slate-900 mb-2">Inga resor hittades</p>
            <p className="text-sm text-slate-500">Inga resor hittades för det valda fordonet under den valda perioden.</p>
          </CardContent>
        </Card>
      ) : currentVehicleGPSId && (
        <div className="space-y-4">
          {selectedTrip && (
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">Vald resa</CardTitle>
                  <CardDescription className="text-xs">
                    {format(parseISO(selectedTrip.begintime), 'dd MMM HH:mm', { locale: sv })} - {format(parseISO(selectedTrip.endtime), 'HH:mm', { locale: sv })}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedTrip(null)}>Stäng</Button>
              </CardHeader>
              <div className="h-[400px] w-full">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {getTripGeoJSON(selectedTrip) && (
                    <Polyline 
                      positions={getTripGeoJSON(selectedTrip).coordinates.map(coord => [coord[1], coord[0]])} 
                      color="#3B82F6" 
                      weight={4} 
                    />
                  )}
                  {selectedTrip.beginposition && (
                    <Marker position={[selectedTrip.beginposition.y, selectedTrip.beginposition.x]}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">Start</p>
                          <p className="text-xs">{selectedTrip.beginaddress || 'Okänd plats'}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {selectedTrip.endposition && (
                    <Marker position={[selectedTrip.endposition.y, selectedTrip.endposition.x]}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">Slut</p>
                          <p className="text-xs">{selectedTrip.endaddress || 'Okänd plats'}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </Card>
          )}

          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="cursor-pointer" onClick={() => handleSort('start_time')}>
                      <div className="flex items-center">
                        Datum & Tid <SortIcon field="start_time" />
                      </div>
                    </TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Slut</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort('distance_km')}>
                      <div className="flex items-center justify-end">
                        Distans <SortIcon field="distance_km" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort('duration_minutes')}>
                      <div className="flex items-center justify-end">
                        Tid <SortIcon field="duration_minutes" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Åtgärd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTrips.map((trip, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        <div className="text-sm">{format(parseISO(trip.begintime), 'dd MMM yyyy', { locale: sv })}</div>
                        <div className="text-xs text-slate-500">{format(parseISO(trip.begintime), 'HH:mm', { locale: sv })} - {format(parseISO(trip.endtime), 'HH:mm', { locale: sv })}</div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate" title={trip.beginaddress || 'Okänd plats'}>
                        {trip.beginaddress || 'Okänd plats'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate" title={trip.endaddress || 'Okänd plats'}>
                        {trip.endaddress || 'Okänd plats'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{(trip.distance / 1000).toFixed(1)} km</TableCell>
                      <TableCell className="text-right text-sm">{getDurationString(trip.duration)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTrip(trip)}>
                          Visa rutt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}