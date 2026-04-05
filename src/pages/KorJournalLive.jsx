import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Play, Square, Navigation, BatteryLow, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useGPSTracking } from '@/hooks/useGPSTracking';

export default function KorJournalLive() {
  const [battery, setBattery] = useState(null);
  const [elapsed, setElapsed] = useState('');

  const {
    isTracking,
    permissionState,
    currentSpeed,
    tripActive,
    startAddress,
    distanceSoFar,
    tripStartTime,
    requestPermission,
    manualStartTrip,
    manualStopTrip
  } = useGPSTracking();

  // Battery API
  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        setBattery(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', () => setBattery(Math.round(bat.level * 100)));
      });
    }
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!tripActive || !tripStartTime) { setElapsed(''); return; }
    const interval = setInterval(() => {
      const diff = Date.now() - tripStartTime.getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [tripActive, tripStartTime]);

  const { data: recentTrips = [] } = useQuery({
    queryKey: ['recentGPSTrips'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-start_time', 5),
    refetchInterval: tripActive ? false : 30000
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">GPS Körjournal</h1>
          {isTracking && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse inline-block" />
              Aktiv
            </Badge>
          )}
        </div>

        {/* Battery warning */}
        {battery !== null && battery < 20 && (
          <div className="flex items-center gap-2 bg-amber-900/40 border border-amber-700/50 rounded-xl p-3 text-amber-300 text-sm">
            <BatteryLow className="h-4 w-4 flex-shrink-0" />
            <span>Batteri {battery}% — GPS-spårning dränerar batteri snabbt</span>
          </div>
        )}

        {/* Permission request */}
        {permissionState !== 'granted' && (
          <Card className="border-0 bg-slate-800">
            <CardContent className="p-6 text-center space-y-4">
              <Navigation className="h-12 w-12 text-blue-400 mx-auto" />
              <div>
                <p className="font-semibold text-white mb-1">Platstillstånd krävs</p>
                <p className="text-slate-400 text-sm">Appen behöver GPS för att automatiskt spåra resor</p>
              </div>
              <Button onClick={requestPermission} className="bg-blue-600 hover:bg-blue-700 w-full">
                Ge åtkomst till plats
              </Button>
              {permissionState === 'denied' && (
                <p className="text-red-400 text-xs">Åtkomst nekad — aktivera i telefonens inställningar</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main speed display */}
        {permissionState === 'granted' && (
          <Card className="border-0 bg-slate-800 overflow-hidden">
            <CardContent className="p-8 text-center">
              {/* Status dot */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className={`h-3 w-3 rounded-full ${tripActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className={`text-sm font-medium ${tripActive ? 'text-green-400' : 'text-slate-400'}`}>
                  {tripActive ? 'Resa pågår' : 'Reser inte'}
                </span>
              </div>

              {/* Speed */}
              <div className="mb-2">
                <span className="text-7xl font-bold tabular-nums">{currentSpeed}</span>
                <span className="text-2xl text-slate-400 ml-2">km/h</span>
              </div>

              {/* Trip stats */}
              {tripActive && (
                <div className="mt-6 space-y-3">
                  {startAddress && (
                    <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-700/50 rounded-lg p-3">
                      <MapPin className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="truncate">Från: {startAddress}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-400">{distanceSoFar.toFixed(1)}</p>
                      <p className="text-xs text-slate-400">km hittills</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-400">{elapsed}</p>
                      <p className="text-xs text-slate-400">tid</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual controls */}
        {permissionState === 'granted' && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={manualStartTrip}
              disabled={tripActive}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-40 gap-2"
            >
              <Play className="h-4 w-4" />
              Starta resa
            </Button>
            <Button
              onClick={manualStopTrip}
              disabled={!tripActive}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 gap-2"
            >
              <Square className="h-4 w-4" />
              Stoppa resa
            </Button>
          </div>
        )}

        {/* Recent trips */}
        {recentTrips.length > 0 && (
          <Card className="border-0 bg-slate-800">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Senaste resor
              </h3>
              <div className="space-y-2">
                {recentTrips.map(trip => (
                  <div key={trip.id} className="flex items-center justify-between bg-slate-700/40 rounded-lg p-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-xs font-medium truncate">
                        {trip.fromAddress || trip.start_location?.address || 'Okänd plats'}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        → {trip.toAddress || trip.end_location?.address || 'Okänd destination'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-white font-semibold">{trip.distance_km?.toFixed(1)} km</p>
                      <p className="text-slate-500 text-xs">
                        {trip.start_time ? format(new Date(trip.start_time), 'd MMM', { locale: sv }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}