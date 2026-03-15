import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createVehicleIcon(color = '#1e293b') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="17" fill="${color}" stroke="white" stroke-width="2"/>
    <path d="M10 20l2-6h12l2 6H10z" fill="white"/>
    <rect x="9" y="20" width="18" height="5" rx="1" fill="white"/>
    <circle cx="13" cy="26" r="2" fill="${color}"/>
    <circle cx="23" cy="26" r="2" fill="${color}"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export default function VehicleMapOverview() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-map'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  // Hämta senaste körjournalpost per fordon för att få senaste position + tid
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal-latest-map'],
    queryFn: () => base44.entities.DrivingJournalEntry.list('-end_time', 1000),
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Åtkomst nekad</p>
      </div>
    );
  }

  // Bygg map: vehicle_id -> senaste journalpost med slutposition
  const latestByVehicle = {};
  for (const entry of journalEntries) {
    if (!entry.end_location?.latitude || !entry.end_location?.longitude) continue;
    if (!latestByVehicle[entry.vehicle_id] || new Date(entry.end_time) > new Date(latestByVehicle[entry.vehicle_id].end_time)) {
      latestByVehicle[entry.vehicle_id] = entry;
    }
  }

  // Fordon med känd position
  const vehiclesWithPos = vehicles
    .map(v => ({ vehicle: v, latest: latestByVehicle[v.id] }))
    .filter(({ latest }) => latest);

  // Centrera kartan på medelvärdet av alla positioner (eller Sverige som default)
  const center = vehiclesWithPos.length > 0
    ? [
        vehiclesWithPos.reduce((s, { latest }) => s + latest.end_location.latitude, 0) / vehiclesWithPos.length,
        vehiclesWithPos.reduce((s, { latest }) => s + latest.end_location.longitude, 0) / vehiclesWithPos.length,
      ]
    : [59.334591, 18.063240];

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Car className="h-6 w-6" />
              Fordonsöversikt – Karta
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Senaste kända position baserat på körjournaldata
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1.5">
            {vehiclesWithPos.length} / {vehicles.length} fordon synliga
          </Badge>
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200 mb-6" style={{ height: '500px' }}>
          <MapContainer center={center} zoom={vehiclesWithPos.length > 0 ? 8 : 6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {vehiclesWithPos.map(({ vehicle, latest }) => (
              <Marker
                key={vehicle.id}
                position={[latest.end_location.latitude, latest.end_location.longitude]}
                icon={createVehicleIcon(vehicle.status === 'aktiv' ? '#1e293b' : '#94a3b8')}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <div className="font-bold text-slate-900 text-base mb-1">{vehicle.registration_number}</div>
                    <div className="text-sm text-slate-600 mb-1">{vehicle.make} {vehicle.model}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      Senast rörd:{' '}
                      {formatDistanceToNow(new Date(latest.end_time), { addSuffix: true, locale: sv })}
                    </div>
                    {latest.end_location.address && (
                      <div className="flex items-start gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{latest.end_location.address.split(',').slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Vehicle list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {vehicles.map(v => {
            const latest = latestByVehicle[v.id];
            return (
              <Card key={v.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${v.status === 'aktiv' ? 'bg-slate-900' : 'bg-slate-200'}`}>
                    <Car className={`h-5 w-5 ${v.status === 'aktiv' ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{v.registration_number}</div>
                    <div className="text-xs text-slate-500">{v.make} {v.model}</div>
                    {latest ? (
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(latest.end_time), { addSuffix: true, locale: sv })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300 mt-1">Ingen positionsdata</div>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${v.status === 'aktiv' ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-400'}`}>
                    {v.status}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}