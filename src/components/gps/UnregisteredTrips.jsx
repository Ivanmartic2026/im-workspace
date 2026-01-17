import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Car, AlertCircle } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import RegisterTripModal from './RegisterTripModal';

export default function UnregisteredTrips({ vehicles }) {
  const [period, setPeriod] = useState('week');
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

  // Hämta GPS-resor för alla fordon MED FÖRDRÖJNING
  const { data: allTripsData, isLoading: tripsLoading, error } = useQuery({
    queryKey: ['gps-trips', period],
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

      const results = [];
      
      for (const vehicle of vehiclesWithGPS) {
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
          
          const tripsWithStatus = trips.map(trip => {
            if (!trip.begintime || !trip.endtime) return null;
            
            const isRegistered = journalEntries.some(entry => {
              if (entry.vehicle_id !== vehicle.id) return false;
              if (entry.gps_trip_id && trip.tripid) {
                return entry.gps_trip_id === trip.tripid.toString();
              }
              return false;
            });
            
            return { ...trip, isRegistered };
          }).filter(t => t !== null);

          results.push({
            vehicle,
            trips: tripsWithStatus
          });

          // Vänta 300ms mellan varje fordon för att undvika rate limit
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`Fel för ${vehicle.registration_number}:`, error);
          results.push({ vehicle, trips: [], error: true });
        }
      }
      
      return results;
    },
    enabled: vehiclesWithGPS.length > 0,
    staleTime: 60000 // Cache i 1 minut
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
    <div className="space-y-3">
      <div className="bg-white p-3 rounded-lg border">
        <p className="text-sm font-medium text-slate-900 mb-2">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: sv })}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setPeriod('day')}
            className={`px-3 py-2 rounded text-sm font-medium ${
              period === 'day' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            1 dag
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-2 rounded text-sm font-medium ${
              period === 'week' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            7 dagar
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-2 rounded text-sm font-medium ${
              period === 'month' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Månad
          </button>
        </div>
      </div>

      {tripsLoading && (
        <div className="p-8 text-center bg-white rounded-lg border">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Hämtar resor...</p>
        </div>
      )}

      {error && (
        <div className="p-6 text-center bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700">Kunde inte hämta resor från GPS</p>
        </div>
      )}

      {!tripsLoading && allTripsData?.map((vehicleData) => {
        if (vehicleData.trips.length === 0) return null;
        const { vehicle, trips } = vehicleData;
        
        return (
          <div key={vehicle.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-slate-600" />
                <div>
                  <h3 className="font-semibold">{vehicle.registration_number}</h3>
                  <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                </div>
              </div>
              <Badge>{trips.length} resor</Badge>
            </div>

            <div className="space-y-2">
              {trips.sort((a, b) => b.begintime - a.begintime).map((trip, idx) => (
                <div key={idx} className={`p-3 rounded ${
                  trip.isRegistered ? 'bg-green-50 border border-green-200' : 'bg-slate-50'
                }`}>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {format(new Date(trip.begintime * 1000), 'EEE d MMM, HH:mm', { locale: sv })} - {format(new Date(trip.endtime * 1000), 'HH:mm', { locale: sv })}
                      </div>
                      <div className="text-sm text-slate-600">
                        {(trip.mileage || 0).toFixed(1)} km • {Math.round((trip.endtime - trip.begintime) / 60)} min
                      </div>
                    </div>
                    {trip.isRegistered && <Badge className="bg-green-600">✓</Badge>}
                  </div>
                </div>
              ))}
            </div>

            {trips.filter(t => !t.isRegistered).length > 0 && (
              <Button
                onClick={() => handleRegisterTrips(vehicle, trips.filter(t => !t.isRegistered))}
                className="w-full bg-slate-900 mt-3"
              >
                Registrera {trips.filter(t => !t.isRegistered).length} resor
              </Button>
            )}
          </div>
        );
      })}

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