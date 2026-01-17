import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ArrowRight, CheckCircle, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export default function GeofenceNotifications({ positions, vehicles, geofences }) {
  const [notifications, setNotifications] = useState([]);
  const [previousStates, setPreviousStates] = useState({});

  useEffect(() => {
    if (!positions || !geofences || positions.length === 0 || geofences.length === 0) return;

    const activeGeofences = geofences.filter(g => g.is_active);
    const newNotifications = [];
    const newStates = { ...previousStates };

    positions.forEach((pos) => {
      const vehicle = vehicles.find(v => v.gps_device_id === pos.deviceid);
      if (!vehicle) return;

      activeGeofences.forEach((geofence) => {
        const distance = calculateDistance(
          pos.callat,
          pos.callon,
          geofence.latitude,
          geofence.longitude
        );

        const isInside = distance <= geofence.radius_meters;
        const stateKey = `${pos.deviceid}-${geofence.id}`;
        const wasInside = previousStates[stateKey];

        // Detect entry
        if (isInside && wasInside === false) {
          newNotifications.push({
            id: `${stateKey}-${Date.now()}-enter`,
            type: 'enter',
            vehicle,
            geofence,
            timestamp: new Date(),
            position: pos
          });
        }

        // Detect exit
        if (!isInside && wasInside === true) {
          newNotifications.push({
            id: `${stateKey}-${Date.now()}-exit`,
            type: 'exit',
            vehicle,
            geofence,
            timestamp: new Date(),
            position: pos
          });
        }

        newStates[stateKey] = isInside;
      });
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
    }

    setPreviousStates(newStates);
  }, [positions, geofences, vehicles]);

  const handleDismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDismissAll = () => {
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.length > 1 && (
        <button
          onClick={handleDismissAll}
          className="ml-auto block text-xs text-slate-500 hover:text-slate-700 mb-1"
        >
          Rensa alla
        </button>
      )}
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`bg-white rounded-lg shadow-lg border-l-4 p-4 ${
              notification.type === 'enter'
                ? 'border-l-green-500'
                : 'border-l-amber-500'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  notification.type === 'enter' ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {notification.type === 'enter' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowRight className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 text-sm">
                      {notification.vehicle.registration_number}
                    </p>
                    <span className={`text-xs font-medium ${
                      notification.type === 'enter' ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {notification.type === 'enter' ? 'Ankom' : 'Lämnade'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                    <MapPin className="h-3 w-3" />
                    <span>{notification.geofence.name}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {notification.timestamp && !isNaN(new Date(notification.timestamp).getTime()) 
                      ? format(notification.timestamp, 'HH:mm:ss', { locale: sv })
                      : 'Nu'}
                  </p>
                  {notification.geofence.auto_classify_as && (
                    <p className="text-xs text-slate-600 mt-1">
                      Auto-klassificering: {notification.geofence.auto_classify_as}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDismiss(notification.id)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}