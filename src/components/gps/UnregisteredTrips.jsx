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

  // Hämta alla körjournalposter
  const { data: allJournalEntries = [] } = useQuery({
    queryKey: ['all-journal-entries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list(),
    staleTime: 10000
  });

  // Hämta och spara GPS-resor
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
          // Hitta senaste sparade GPS-resa för detta fordon
          const vehicleEntries = allJournalEntries.filter(e => e.vehicle_id === vehicle.id && e.gps_trip_id);
          const lastSavedTrip = vehicleEntries.sort((a, b) => new Date(b.start_time) - new Date(a.start_time))[0];

          // Hämta från senaste resa eller från periodens start
          const fetchStartDate = lastSavedTrip 
            ? new Date(lastSavedTrip.start_time)
            : startDate;

          const response = await base44.functions.invoke('gpsTracking', {
            action: 'getTrips',
            params: {
              deviceId: vehicle.gps_device_id,
              begintime: Math.floor(fetchStartDate.getTime() / 1000),
              endtime: Math.floor(now.getTime() / 1000)
            }
          });

          const trips = response.data?.totaltrips || [];
          
          // Spara nya resor i systemet
          for (const trip of trips) {
            if (!trip.begintime || !trip.endtime || !trip.tripid) continue;
            
            const exists = allJournalEntries.some(e => 
              e.gps_trip_id === trip.tripid.toString() && e.vehicle_id === vehicle.id
            );
            
            if (!exists) {
              await base44.entities.DrivingJournalEntry.create({
                vehicle_id: vehicle.id,
                registration_number: vehicle.registration_number,
                gps_trip_id: trip.tripid.toString(),
                start_time: new Date(trip.begintime * 1000).toISOString(),
                end_time: new Date(trip.endtime * 1000).toISOString(),
                distance_km: trip.mileage || 0,
                duration_minutes: Math.round((trip.endtime - trip.begintime) / 60),
                trip_type: 'väntar',
                status: 'pending_review',
                start_location: trip.beginaddress ? { address: trip.beginaddress } : {},
                end_location: trip.endaddress ? { address: trip.endaddress } : {}
              });
            }
          }

          // Hämta alla resor för detta fordon från databasen för vald period
          const periodEntries = allJournalEntries.filter(e => {
            if (e.vehicle_id !== vehicle.id) return false;
            const entryStart = new Date(e.start_time);
            return entryStart >= startDate && entryStart <= now;
          });

          results.push({
            vehicle,
            trips: periodEntries.map(entry => ({
              tripid: entry.gps_trip_id,
              begintime: Math.floor(new Date(entry.start_time).getTime() / 1000),
              endtime: Math.floor(new Date(entry.end_time).getTime() / 1000),
              mileage: entry.distance_km,
              beginaddress: entry.start_location?.address,
              endaddress: entry.end_location?.address,
              isRegistered: entry.trip_type !== 'väntar'
            })).sort((a, b) => b.begintime - a.begintime)
          });

          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`Fel för ${vehicle.registration_number}:`, error);
          results.push({ vehicle, trips: [], error: true });
        }
      }
      
      queryClient.invalidateQueries(['all-journal-entries']);
      return results;
    },
    enabled: vehiclesWithGPS.length > 0 && allJournalEntries.length >= 0,
    staleTime: 300000
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