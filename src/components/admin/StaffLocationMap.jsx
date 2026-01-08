import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function StaffLocationMap() {
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['activeTimeEntries'],
    queryFn: async () => {
      const all = await base44.entities.TimeEntry.list();
      return all.filter(entry => entry.status === 'active' && entry.clock_in_location);
    },
    refetchInterval: 30000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const staffLocations = useMemo(() => {
    return timeEntries.map(entry => {
      const employee = employees.find(e => e.user_email === entry.employee_email);
      const user = users.find(u => u.email === entry.employee_email);
      
      return {
        id: entry.id,
        name: user?.full_name || entry.employee_email,
        email: entry.employee_email,
        department: employee?.department || 'Okänd',
        lat: entry.clock_in_location?.latitude,
        lng: entry.clock_in_location?.longitude,
        address: entry.clock_in_location?.address || 'Okänd plats',
        clockInTime: entry.clock_in_time,
      };
    }).filter(loc => loc.lat && loc.lng);
  }, [timeEntries, employees, users]);

  const mapCenter = staffLocations.length > 0
    ? [staffLocations[0].lat, staffLocations[0].lng]
    : [59.3293, 18.0686]; // Stockholm

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Personalens position
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-96 rounded-b-xl overflow-hidden">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {staffLocations.map(location => (
              <Marker key={location.id} position={[location.lat, location.lng]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{location.name}</p>
                    <p className="text-xs text-slate-500">{location.department}</p>
                    <p className="text-xs text-slate-600 mt-1">{location.address}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Instämplad: {new Date(location.clockInTime).toLocaleTimeString('sv-SE')}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="p-4 bg-slate-50 border-t">
          <p className="text-sm text-slate-600">
            {staffLocations.length} anställd{staffLocations.length !== 1 ? 'a' : ''} instämplad{staffLocations.length !== 1 ? 'a' : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}