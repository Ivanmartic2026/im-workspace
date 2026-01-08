import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Navigation, Clock, FileText, Car } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { sv } from "date-fns/locale";
import RegisterTripModal from './RegisterTripModal';

export default function RouteHistoryMap({ vehicles }) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedVehicleForRegister, setSelectedVehicleForRegister] = useState(null);
  const [selectedTrips, setSelectedTrips] = useState([]);

  const vehiclesWithGPS = vehicles.filter(v => v.gps_device_id);

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    if (selectedPeriod === 'week') {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 })
      };
    } else {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    }
  };

  const dateRange = getDateRange();

  // Fetch trips for all vehicles with GPS
  const { data: allTripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['vehicle-trips-history', selectedPeriod, vehiclesWithGPS.map(v => v.gps_device_id)],
    queryFn: async () => {
      const promises = vehiclesWithGPS.map(async (vehicle) => {
        try {
          const response = await base44.functions.invoke('gpsTracking', {
            action: 'getTrips',
            params: {
              deviceId: vehicle.gps_device_id,
              begintime: format(dateRange.start, 'yyyy-MM-dd') + ' 00:00:00',
              endtime: format(dateRange.end, 'yyyy-MM-dd') + ' 23:59:59'
            }
          });
          return {
            vehicle,
            trips: response.data?.totaltrips || [],
            stats: {
              totalDistance: (response.data?.totaldistance || 0) / 1000,
              totalTime: (response.data?.totaltriptime || 0) / (1000 * 60)
            }
          };
        } catch (error) {
          console.error(`Error fetching trips for ${vehicle.registration_number}:`, error);
          return { vehicle, trips: [], stats: { totalDistance: 0, totalTime: 0 } };
        }
      });
      return Promise.all(promises);
    },
    enabled: vehiclesWithGPS.length > 0
  });

  // Fetch existing journal entries
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => base44.entities.DrivingJournalEntry.list()
  });

  const handleRegisterTrips = (vehicle, trips) => {
    setSelectedVehicleForRegister(vehicle);
    setSelectedTrips(trips);
    setShowRegisterModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <TabsList className="w-full bg-white shadow-sm">
          <TabsTrigger value="week" className="flex-1">
            Denna vecka
          </TabsTrigger>
          <TabsTrigger value="month" className="flex-1">
            Denna månad
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tripsLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-500">Hämtar resor...</p>
          </CardContent>
        </Card>
      ) : allTripsData?.length > 0 ? (
        <div className="space-y-3">
          {allTripsData
            .filter(data => data.trips.length > 0)
            .map((data) => {
              const { vehicle, trips, stats } = data;
              const registeredGpsIds = new Set(
                journalEntries
                  .filter(e => e.vehicle_id === vehicle.id)
                  .map(e => e.gps_trip_id)
              );
              const unregisteredTrips = trips.filter(t => !registeredGpsIds.has(t.tripid));
              
              return (
                <Card key={vehicle.id} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Car className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{vehicle.registration_number}</h3>
                          <p className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</p>
                          {vehicle.assigned_driver && (
                            <p className="text-xs text-slate-500 mt-1">Förare: {vehicle.assigned_driver}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-50">
                          {trips.length} resor
                        </Badge>
                        {unregisteredTrips.length > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            {unregisteredTrips.length} ej registrerade
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Total sträcka</p>
                          <p className="text-sm font-semibold text-slate-900">{stats.totalDistance.toFixed(1)} km</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Total tid</p>
                          <p className="text-sm font-semibold text-slate-900">{Math.round(stats.totalTime)} min</p>
                        </div>
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="space-y-2 mb-4">
                      {trips.slice(0, 10).map((trip, idx) => {
                        // GPS API använder olika fältnamn beroende på endpoint
                        const startAddress = trip.startaddress || trip.startAddress || trip.beginAddress;
                        const endAddress = trip.endaddress || trip.endAddress || trip.stopAddress;
                        const startLat = trip.startlat || trip.startLat || trip.beginLat;
                        const startLon = trip.startlon || trip.startLon || trip.beginLon;
                        const endLat = trip.endlat || trip.endLat || trip.stopLat;
                        const endLon = trip.endlon || trip.endLon || trip.stopLon;
                        
                        return (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {format(new Date(trip.starttime || trip.startTime || trip.beginTime), 'dd MMM, HH:mm', { locale: sv })} - {format(new Date(trip.endtime || trip.endTime || trip.stopTime), 'HH:mm', { locale: sv })}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {((trip.tripdistance || trip.tripDistance || trip.distance || 0) / 1000).toFixed(1)} km
                            </span>
                          </div>
                          {startAddress && (
                            <div className="mb-1">
                              <p className="text-xs text-slate-500 mb-0.5">Start:</p>
                              <p className="text-sm text-slate-700">
                                📍 {startAddress}
                              </p>
                            </div>
                          )}
                          {endAddress && startAddress !== endAddress && (
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">Slut:</p>
                              <p className="text-sm text-slate-700">
                                🏁 {endAddress}
                              </p>
                            </div>
                          )}
                          {!startAddress && startLat && startLon && (
                            <p className="text-xs text-slate-500">
                              Start: {startLat.toFixed(4)}, {startLon.toFixed(4)}
                            </p>
                          )}
                        </div>
                      )})}
                    </div>
                      {trips.length > 10 && (
                        <p className="text-xs text-slate-500 text-center py-2">
                          +{trips.length - 10} resor till
                        </p>
                      )}
                    </div>

                    {unregisteredTrips.length > 0 && (
                      <Button
                        onClick={() => handleRegisterTrips(vehicle, unregisteredTrips)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Registrera {unregisteredTrips.length} {unregisteredTrips.length === 1 ? 'resa' : 'resor'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Navigation className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Inga resor hittades för vald period</p>
          </CardContent>
        </Card>
      )}

      <RegisterTripModal
        open={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          setSelectedVehicleForRegister(null);
          setSelectedTrips([]);
        }}
        trips={selectedTrips}
        vehicleId={selectedVehicleForRegister?.id}
        vehicleReg={selectedVehicleForRegister?.registration_number}
        onSuccess={() => {
          // Refresh data after successful registration
          setShowRegisterModal(false);
        }}
      />
    </div>
  );
}