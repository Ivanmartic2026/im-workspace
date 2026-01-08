import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function GeofenceAlerts({ positions, vehicles }) {
  const [alerts, setAlerts] = useState([]);

  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => base44.entities.Geofence.filter({ is_active: true }),
  });

  useEffect(() => {
    if (!positions || !geofences || positions.length === 0) return;

    const newAlerts = [];

    positions.forEach(pos => {
      const vehicle = vehicles.find(v => v.gps_device_id === pos.deviceid);
      if (!vehicle) return;

      geofences.forEach(geofence => {
        const distance = calculateDistance(
          pos.callat, pos.callon,
          geofence.latitude, geofence.longitude
        );

        const isInside = distance * 1000 <= geofence.radius_meters;
        const alertKey = `${pos.deviceid}-${geofence.id}`;

        const previousStatus = localStorage.getItem(`geofence-${alertKey}`);
        const currentStatus = isInside ? 'inside' : 'outside';

        if (currentStatus !== previousStatus) {
          localStorage.setItem(`geofence-${alertKey}`, currentStatus);
          
          newAlerts.push({
            id: alertKey,
            vehicleName: vehicle.registration_number,
            geofenceName: geofence.name,
            type: isInside ? 'entered' : 'exited',
            isInside,
            timestamp: new Date(),
            distance: Math.round(distance * 1000)
          });
        }
      });
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 5));
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => {
          const age = Date.now() - a.timestamp.getTime();
          return age < 10000;
        }));
      }, 100);
    }
  }, [positions, geofences, vehicles]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      <AnimatePresence>
        {alerts.map(alert => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className={`${
              alert.type === 'entered' 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-start gap-3">
                {alert.type === 'entered' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className={`${
                    alert.type === 'entered' 
                      ? 'text-amber-900' 
                      : 'text-emerald-900'
                  }`}>
                    <p className="font-medium">
                      {alert.vehicleName} {alert.type === 'entered' ? 'kör in i' : 'lämnade'} {alert.geofenceName}
                    </p>
                    {alert.type === 'entered' && (
                      <p className="text-xs opacity-75 mt-1">
                        Avstånd: {Math.max(0, alert.distance - 200)} m från gräns
                      </p>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}