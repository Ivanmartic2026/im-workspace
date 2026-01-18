import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Car, AlertCircle, RefreshCw } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { sv } from "date-fns/locale";
import RegisterTripModal from './RegisterTripModal';

export default function UnregisteredTrips({ vehicles }) {
  const [period, setPeriod] = useState('week');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);

  // Hämta oregistrerade resor direkt från databasen (SNABBT!)
  const { data: allTripsData, isLoading: tripsLoading, error, refetch } = useQuery({
    queryKey: ['unregistered-trips-from-db', period],
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

      // Hämta alla resor från databasen
      const allEntries = await base44.entities.DrivingJournalEntry.list();
      console.log('Alla körjournalposter:', allEntries.length);
      
      const results = [];
      
      for (const vehicle of vehiclesWithGPS) {
        const unregisteredEntries = allEntries.filter(e => {
          if (e.vehicle_id !== vehicle.id) return false;
          // Visa alla resor som väntar på registrering ELLER saknar syfte
          if (e.trip_type !== 'väntar' && e.purpose) return false;
          if (e.is_deleted) return false;
          const entryStart = new Date(e.start_time);
          return entryStart >= startDate && entryStart <= now;
        });

        console.log(`${vehicle.registration_number}: ${unregisteredEntries.length} oregistrerade resor`);

        if (unregisteredEntries.length > 0) {
          results.push({
            vehicle,
            trips: unregisteredEntries.map(entry => ({
              id: entry.id,
              tripid: entry.gps_trip_id,
              begintime: Math.floor(new Date(entry.start_time).getTime() / 1000),
              endtime: Math.floor(new Date(entry.end_time).getTime() / 1000),
              mileage: entry.distance_km,
              beginaddress: entry.start_location?.address,
              endaddress: entry.end_location?.address
            })).sort((a, b) => b.begintime - a.begintime)
          });
        }
      }
      
      console.log('Resultat:', results);
      return results;
    },
    enabled: vehiclesWithGPS.length > 0,
    staleTime: 10000
  });

  // Synka nya resor från GPS
  const syncTripsFromGPS = async () => {
    setIsSyncing(true);
    try {
      const now = new Date();
      let startDate;
      
      if (period === 'day') {
        startDate = startOfDay(now);
      } else if (period === 'week') {
        startDate = subDays(now, 7);
      } else {
        startDate = subDays(now, 30);
      }

      console.log('Synkar från', startDate, 'till', now);
      console.log('Antal fordon med GPS:', vehiclesWithGPS.length);

      let totalSynced = 0;
      for (const vehicle of vehiclesWithGPS) {
        console.log(`Synkar ${vehicle.registration_number} (${vehicle.gps_device_id})...`);
        const result = await base44.functions.invoke('syncGPSTrips', {
          vehicleId: vehicle.id,
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        });
        console.log('Synkresultat:', result.data);
        totalSynced += (result.data?.synced || 0);
      }

      console.log(`Totalt synkade: ${totalSynced} resor`);

      // Uppdatera listan
      await queryClient.invalidateQueries(['unregistered-trips-from-db']);
      await refetch();
    } catch (error) {
      console.error('Synkroniseringsfel:', error);
      alert('Fel vid synkning: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

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
        <div className="grid grid-cols-3 gap-2 mb-3">
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
        <Button 
          onClick={syncTripsFromGPS} 
          disabled={isSyncing}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Synkar nya resor...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Synka nya resor från GPS
            </>
          )}
        </Button>
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

      {!tripsLoading && !isSyncing && allTripsData?.length === 0 && (
        <div className="p-6 text-center bg-slate-50 rounded-lg border">
          <Car className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Inga oregistrerade resor hittades</p>
          <p className="text-xs text-slate-500 mt-1">Klicka på "Synka nya resor från GPS" för att hämta resor</p>
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
              {trips.map((trip, idx) => (
                <div key={idx} className="p-3 rounded bg-slate-50">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {format(new Date(trip.begintime * 1000), 'EEE d MMM, HH:mm', { locale: sv })} - {format(new Date(trip.endtime * 1000), 'HH:mm', { locale: sv })}
                      </div>
                      <div className="text-sm text-slate-600">
                        {(trip.mileage || 0).toFixed(1)} km • {Math.round((trip.endtime - trip.begintime) / 60)} min
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => handleRegisterTrips(vehicle, trips)}
              className="w-full bg-slate-900 mt-3"
            >
              Registrera {trips.length} resor
            </Button>
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