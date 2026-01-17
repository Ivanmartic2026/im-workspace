import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Car, AlertCircle, Calendar, CheckCircle2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import RegisterTripModal from './RegisterTripModal';

export default function UnregisteredTrips({ vehicles }) {
  const [period, setPeriod] = useState('day'); // 'day', 'week', 'month'
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);

  // Hämta alla körjournalposter för perioden
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal-entries', period],
    queryFn: async () => {
      const now = new Date();
      let startDate;
      
      if (period === 'day') {
        startDate = startOfDay(now);
      } else if (period === 'week') {
        startDate = subDays(now, 7);
      } else {
        startDate = subDays(now, 30);
      }

      return base44.entities.DrivingJournalEntry.filter({
        start_time: { $gte: startDate.toISOString() }
      });
    }
  });

  // Hämta GPS-resor för alla fordon
  const { data: allTripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['unregistered-gps-trips', period, vehiclesWithGPS],
    queryFn: async () => {
      if (vehiclesWithGPS.length === 0) return [];

      const now = new Date();
      let startDate;
      
      if (period === 'day') {
        startDate = startOfDay(now);
      } else if (period === 'week') {
        startDate = subDays(now, 7);
      } else {
        startDate = subDays(now, 30);
      }

      const promises = vehiclesWithGPS.map(async (vehicle) => {
        try {
          const response = await base44.functions.invoke('gpsTracking', {
            action: 'getTrips',
            params: {
              deviceId: vehicle.gps_device_id,
              begintime: Math.floor(startDate.getTime() / 1000),
              endtime: Math.floor(now.getTime() / 1000)
            }
          });

          const trips = response.data?.totaltrips || [];
          
          // Filtrera bort redan registrerade resor
          const unregisteredTrips = trips.filter(trip => {
            if (!trip.begintime || !trip.endtime) return false;
            const tripStart = new Date(trip.begintime * 1000);
            const tripEnd = new Date(trip.endtime * 1000);
            
            // Kolla om det finns någon journalpost som matchar denna resa
            // Använd gps_trip_id om det finns, annars tid och fordon
            return !journalEntries.some(entry => {
              if (entry.vehicle_id !== vehicle.id) return false;
              
              // Om journalposten har ett gps_trip_id, matcha mot det
              if (entry.gps_trip_id && trip.tripid) {
                return entry.gps_trip_id === trip.tripid.toString();
              }
              
              // Annars, matcha baserat på tid med marginal
              const entryStart = new Date(entry.start_time);
              const entryEnd = new Date(entry.end_time);
              
              const margin = 5 * 60 * 1000; // 5 minuter
              return Math.abs(tripStart - entryStart) < margin && 
                     Math.abs(tripEnd - entryEnd) < margin;
            });
          });

          return {
            vehicle,
            trips: unregisteredTrips,
            totalDistance: unregisteredTrips.reduce((sum, trip) => sum + (trip.mileage || 0), 0),
            totalTime: unregisteredTrips.reduce((sum, trip) => sum + ((trip.endtime - trip.begintime) || 0), 0)
          };
        } catch (error) {
          console.error(`Failed to fetch trips for ${vehicle.registration_number}:`, error);
          return { vehicle, trips: [], totalDistance: 0, totalTime: 0 };
        }
      });

      const results = await Promise.all(promises);
      
      // Filtrera bort fordon utan oregistrerade resor
      return results.filter(r => r.trips.length > 0);
    },
    enabled: vehiclesWithGPS.length > 0
  });

  const handleRegisterTrips = (vehicle, trips) => {
    setSelectedVehicle(vehicle);
    setSelectedTrips(trips);
    setRegisterModalOpen(true);
  };

  const handleRegisterSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['unregistered-gps-trips'] });
    queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
  };

  const getPeriodLabel = () => {
    if (period === 'day') return 'Idag';
    if (period === 'week') return 'Senaste veckan';
    return 'Senaste månaden';
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setPeriod('day')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 'day'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Idag
        </button>
        <button
          onClick={() => setPeriod('week')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 'week'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Vecka
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 'month'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Månad
        </button>
      </div>

      {/* Loading state */}
      {tripsLoading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 mt-4">Letar efter oregistrerade resor...</p>
          </CardContent>
        </Card>
      )}

      {/* No unregistered trips */}
      {!tripsLoading && allTripsData?.length === 0 && (
        <Card className="border-0 shadow-sm bg-emerald-50 border-l-4 border-l-emerald-500">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-emerald-900 mb-1">
              Alla resor registrerade!
            </h3>
            <p className="text-sm text-emerald-700">
              Det finns inga oregistrerade GPS-resor {getPeriodLabel().toLowerCase()}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Vehicles with unregistered trips */}
      {!tripsLoading && allTripsData?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-slate-600">
              <strong>{allTripsData.length}</strong> fordon med oregistrerade resor {getPeriodLabel().toLowerCase()}
            </p>
          </div>

          {allTripsData.map((vehicleData) => {
            const { vehicle, trips, totalDistance, totalTime } = vehicleData;
            
            // Gruppera resor per dag
            const tripsByDay = {};
            trips.forEach(trip => {
              if (!trip.begintime) return;
              const date = format(new Date(trip.begintime * 1000), 'yyyy-MM-dd');
              if (!tripsByDay[date]) {
                tripsByDay[date] = [];
              }
              tripsByDay[date].push(trip);
            });

            return (
              <Card key={vehicle.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Car className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {vehicle.registration_number}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {vehicle.make} {vehicle.model}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {trips.length} {trips.length === 1 ? 'resa' : 'resor'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">
                        {Object.keys(tripsByDay).length} {Object.keys(tripsByDay).length === 1 ? 'dag' : 'dagar'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">
                        {totalDistance.toFixed(1)} km
                      </span>
                    </div>
                  </div>

                  {/* Trips per day */}
                  <div className="border-t border-slate-100 pt-3 mb-3 space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(tripsByDay)
                      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                      .map(([date, dayTrips]) => (
                        <div key={date} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            {format(new Date(date), 'EEE d MMM', { locale: sv })}
                          </span>
                          <span className="text-slate-700 font-medium">
                            {dayTrips.length} {dayTrips.length === 1 ? 'resa' : 'resor'} • {' '}
                            {dayTrips.reduce((sum, trip) => sum + (trip.mileage || 0), 0).toFixed(1)} km
                          </span>
                        </div>
                      ))}
                  </div>

                  <Button
                    onClick={() => handleRegisterTrips(vehicle, trips)}
                    className="w-full bg-slate-900 hover:bg-slate-800"
                  >
                    Registrera resor
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Register Modal */}
      {selectedVehicle && (
        <RegisterTripModal
          open={registerModalOpen}
          onClose={() => {
            setRegisterModalOpen(false);
            setSelectedVehicle(null);
            setSelectedTrips([]);
          }}
          trips={selectedTrips}
          vehicleId={selectedVehicle.id}
          vehicleReg={selectedVehicle.registration_number}
          onSuccess={handleRegisterSuccess}
        />
      )}
    </div>
  );
}