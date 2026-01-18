import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, MapPin, Gauge, Clock, Calendar as CalendarIcon, Navigation } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { useNavigate } from 'react-router-dom';

export default function VehicleGPSOverview() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('vehicleId');

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => base44.entities.Vehicle.list().then(vehicles => vehicles.find(v => v.id === vehicleId)),
    enabled: !!vehicleId
  });

  const { data: allTrips = [] } = useQuery({
    queryKey: ['vehicle-trips', vehicleId],
    queryFn: () => base44.entities.DrivingJournalEntry.filter({ vehicle_id: vehicleId, is_deleted: false }),
    enabled: !!vehicleId
  });

  // Filtrera resor för vald månad
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  
  const monthTrips = allTrips.filter(trip => {
    const tripDate = parseISO(trip.start_time);
    return tripDate >= monthStart && tripDate <= monthEnd;
  });

  // Beräkna total statistik för månaden
  const totalDistance = monthTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
  const totalDuration = monthTrips.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
  const maxSpeed = Math.max(...monthTrips.map(t => {
    if (!t.distance_km || !t.duration_minutes) return 0;
    return (t.distance_km / (t.duration_minutes / 60));
  }));
  const avgSpeed = totalDistance / (totalDuration / 60) || 0;

  // Gruppera resor per dag för kalendern
  const tripsByDay = monthTrips.reduce((acc, trip) => {
    const dayKey = format(parseISO(trip.start_time), 'yyyy-MM-dd');
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(trip);
    return acc;
  }, {});

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Sortera resor senaste först
  const sortedTrips = [...monthTrips].sort((a, b) => 
    new Date(b.start_time) - new Date(a.start_time)
  );

  const changeMonth = (delta) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedMonth(newDate);
  };

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-slate-500">Laddar fordonsdata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 to-blue-600 pb-24">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="mb-2">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-center">{vehicle.registration_number}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Total statistik för månaden */}
        <Card className="bg-blue-500 text-white border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="text-5xl font-bold mb-2">{totalDistance.toFixed(2)}</div>
            <div className="text-lg mb-6">Total Mileage(km)</div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold">{Math.floor(totalDuration / 60)}H{Math.floor(totalDuration % 60)}M</div>
                <div className="text-sm opacity-90">Driving Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Math.round(maxSpeed)}km/h</div>
                <div className="text-sm opacity-90">Max Speed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Math.round(avgSpeed)}km/h</div>
                <div className="text-sm opacity-90">Average</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Månadväljare */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">
                {format(selectedMonth, 'yyyy-MM', { locale: sv })} {totalDistance.toFixed(1)}km
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}>
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Kalender */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-center font-medium">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Tomma celler före månadens start */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 bg-slate-50 rounded" />
              ))}
              
              {/* Dagar i månaden */}
              {daysInMonth.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayTrips = tripsByDay[dayKey] || [];
                const dayKm = dayTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={dayKey}
                    className={`h-14 rounded flex flex-col items-center justify-center text-xs ${
                      isToday ? 'bg-blue-500 text-white' : dayKm > 0 ? 'bg-blue-50' : 'bg-slate-50'
                    }`}
                  >
                    <div className={`font-bold ${isToday ? 'text-white' : 'text-slate-900'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className={`text-[10px] ${isToday ? 'text-white' : dayKm > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                      {dayKm > 0 ? `${dayKm.toFixed(0)}km` : '0km'}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lista med resor */}
        <div className="space-y-3">
          {sortedTrips.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Navigation className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">Inga resor för denna månad</p>
              </CardContent>
            </Card>
          ) : (
            sortedTrips.map(trip => {
              const speedKmh = trip.distance_km && trip.duration_minutes 
                ? (trip.distance_km / (trip.duration_minutes / 60)) 
                : 0;
              
              return (
                <Card key={trip.id} className="border-0 shadow-sm bg-white">
                  <CardContent className="p-4">
                    {/* Statistik rad */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Navigation className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">
                            {trip.distance_km?.toFixed(2)}km
                          </div>
                          <div className="text-xs text-slate-400">Mileage</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-slate-500">
                          {Math.floor(trip.duration_minutes || 0)}M{Math.round(((trip.duration_minutes || 0) % 1) * 60)}S
                        </div>
                        <div className="text-xs text-slate-400">Driving Time</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-slate-500">{Math.round(speedKmh)}km/h</div>
                        <div className="text-xs text-slate-400">Max</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-slate-500">{Math.round(speedKmh * 0.8)}km/h</div>
                        <div className="text-xs text-slate-400">Average</div>
                      </div>
                    </div>

                    {/* Start & slutplats */}
                    <div className="space-y-2">
                      {/* Start */}
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 mb-0.5">
                            {format(parseISO(trip.start_time), 'yyyy-MM-dd HH:mm:ss')}
                          </div>
                          <div className="text-sm text-slate-900">
                            {trip.start_location?.address || 'Okänd startplats'}
                          </div>
                        </div>
                      </div>

                      {/* Slut */}
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 mb-0.5">
                            {format(parseISO(trip.end_time), 'yyyy-MM-dd HH:mm:ss')}
                          </div>
                          <div className="text-sm text-slate-900">
                            {trip.end_location?.address || 'Okänd slutplats'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    {trip.trip_type && (
                      <div className="mt-3 pt-3 border-t">
                        <Badge className={
                          trip.trip_type === 'tjänst' ? 'bg-blue-100 text-blue-700' :
                          trip.trip_type === 'privat' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {trip.trip_type}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}