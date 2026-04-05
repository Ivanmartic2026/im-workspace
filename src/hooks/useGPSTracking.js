import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const TRIP_START_SPEED_KMH = 15;
const TRIP_END_SPEED_KMH = 5;
const TRIP_START_DURATION_MS = 10 * 1000;   // 10 seconds above speed threshold
const TRIP_END_DURATION_MS = 60 * 1000;     // 60 seconds below speed threshold

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat, lng) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=sv`,
      { headers: { 'User-Agent': 'IM-Workspace/1.0' } }
    );
    const data = await resp.json();
    const addr = data.address || {};
    const street = (addr.road || '') + (addr.house_number ? ' ' + addr.house_number : '');
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    return [street, city].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || '';
  } catch {
    return '';
  }
}

export function useGPSTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown'); // 'unknown' | 'granted' | 'denied'
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [tripActive, setTripActive] = useState(false);
  const [startAddress, setStartAddress] = useState('');
  const [distanceSoFar, setDistanceSoFar] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);

  const watchIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const tripDataRef = useRef(null);
  const aboveSpeedSinceRef = useRef(null);
  const belowSpeedSinceRef = useRef(null);
  const distanceAccRef = useRef(0);

  const saveTrip = useCallback(async (tripData) => {
    try {
      const user = await base44.auth.me();
      const vehicles = await base44.entities.Vehicle.list();
      // Pick first vehicle assigned to user or first available
      const vehicle = vehicles.find(v => v.assigned_driver === user?.email) || vehicles[0];

      const endAddr = await reverseGeocode(tripData.endLat, tripData.endLng);

      const entry = {
        vehicle_id: vehicle?.id || 'unknown',
        registration_number: vehicle?.registration_number || '',
        driver_email: user?.email || '',
        driver_name: user?.full_name || '',
        start_time: tripData.startTime,
        end_time: tripData.endTime,
        startTime: tripData.startTime,
        endTime: tripData.endTime,
        distance_km: parseFloat(tripData.distanceKm.toFixed(2)),
        duration_minutes: Math.round((new Date(tripData.endTime) - new Date(tripData.startTime)) / 60000),
        trip_type: 'väntar',
        status: 'pending_review',
        fromAddress: tripData.startAddress,
        toAddress: endAddr,
        fromLat: tripData.startLat,
        fromLng: tripData.startLng,
        toLat: tripData.endLat,
        toLng: tripData.endLng,
        start_location: { latitude: tripData.startLat, longitude: tripData.startLng, address: tripData.startAddress },
        end_location: { latitude: tripData.endLat, longitude: tripData.endLng, address: endAddr },
        is_manual: false
      };

      await base44.entities.DrivingJournalEntry.create(entry);
    } catch (e) {
      console.error('Failed to save GPS trip:', e);
    }
  }, []);

  const handlePosition = useCallback(async (position) => {
    const { latitude: lat, longitude: lng, speed } = position.coords;
    const speedKmh = speed != null ? speed * 3.6 : 0;
    const now = Date.now();

    setCurrentSpeed(Math.round(speedKmh));
    setCurrentPosition({ lat, lng });

    // Accumulate distance while trip is active
    if (tripDataRef.current && lastPositionRef.current) {
      const d = haversineKm(lastPositionRef.current.lat, lastPositionRef.current.lng, lat, lng);
      distanceAccRef.current += d;
      setDistanceSoFar(parseFloat(distanceAccRef.current.toFixed(2)));
    }
    lastPositionRef.current = { lat, lng };

    // --- Trip start detection ---
    if (!tripDataRef.current) {
      if (speedKmh >= TRIP_START_SPEED_KMH) {
        if (!aboveSpeedSinceRef.current) aboveSpeedSinceRef.current = now;
        if (now - aboveSpeedSinceRef.current >= TRIP_START_DURATION_MS) {
          // Start trip
          const addr = await reverseGeocode(lat, lng);
          const startTime = new Date().toISOString();
          tripDataRef.current = { startLat: lat, startLng: lng, startAddress: addr, startTime };
          distanceAccRef.current = 0;
          belowSpeedSinceRef.current = null;
          setTripActive(true);
          setStartAddress(addr);
          setTripStartTime(new Date());
          setDistanceSoFar(0);

          // Browser notification
          if (Notification.permission === 'granted') {
            new Notification('Resa startad', { body: addr || 'Automatisk GPS-detekterad resa' });
          }
        }
      } else {
        aboveSpeedSinceRef.current = null;
      }
    }

    // --- Trip end detection ---
    if (tripDataRef.current) {
      if (speedKmh < TRIP_END_SPEED_KMH) {
        if (!belowSpeedSinceRef.current) belowSpeedSinceRef.current = now;
        if (now - belowSpeedSinceRef.current >= TRIP_END_DURATION_MS) {
          // End trip
          const trip = { ...tripDataRef.current, endLat: lat, endLng: lng, endTime: new Date().toISOString(), distanceKm: distanceAccRef.current };
          tripDataRef.current = null;
          aboveSpeedSinceRef.current = null;
          belowSpeedSinceRef.current = null;
          setTripActive(false);
          setStartAddress('');
          setDistanceSoFar(0);
          setTripStartTime(null);
          await saveTrip(trip);
        }
      } else {
        belowSpeedSinceRef.current = null;
      }
    }
  }, [saveTrip]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    setIsTracking(true);
    setPermissionState('granted');
  }, [handlePosition]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setTripActive(false);
    setCurrentSpeed(0);
    tripDataRef.current = null;
  }, []);

  const requestPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setPermissionState('denied');
      return;
    }
    // Request notification permission too
    if (Notification && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    navigator.geolocation.getCurrentPosition(
      () => { setPermissionState('granted'); startTracking(); },
      () => setPermissionState('denied'),
      { enableHighAccuracy: true }
    );
  }, [startTracking]);

  const manualStartTrip = useCallback(async () => {
    if (!currentPosition) return;
    const addr = await reverseGeocode(currentPosition.lat, currentPosition.lng);
    tripDataRef.current = { startLat: currentPosition.lat, startLng: currentPosition.lng, startAddress: addr, startTime: new Date().toISOString() };
    distanceAccRef.current = 0;
    belowSpeedSinceRef.current = null;
    setTripActive(true);
    setStartAddress(addr);
    setTripStartTime(new Date());
    setDistanceSoFar(0);
  }, [currentPosition]);

  const manualStopTrip = useCallback(async () => {
    if (!tripDataRef.current || !currentPosition) return;
    const trip = {
      ...tripDataRef.current,
      endLat: currentPosition.lat,
      endLng: currentPosition.lng,
      endTime: new Date().toISOString(),
      distanceKm: distanceAccRef.current
    };
    tripDataRef.current = null;
    setTripActive(false);
    setStartAddress('');
    setDistanceSoFar(0);
    setTripStartTime(null);
    await saveTrip(trip);
  }, [currentPosition, saveTrip]);

  // Check permission on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          setPermissionState('granted');
          startTracking();
        } else if (result.state === 'denied') {
          setPermissionState('denied');
        }
      });
    }
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isTracking,
    permissionState,
    currentSpeed,
    currentPosition,
    tripActive,
    startAddress,
    distanceSoFar,
    tripStartTime,
    requestPermission,
    startTracking,
    stopTracking,
    manualStartTrip,
    manualStopTrip,
    reverseGeocode
  };
}