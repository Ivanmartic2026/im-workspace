import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Loader2, LogIn, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const categories = [
  { id: 'support_service', label: 'Support & Service', color: 'bg-blue-500' },
  { id: 'install', label: 'Install', color: 'bg-purple-500' },
  { id: 'interntid', label: 'Interntid', color: 'bg-slate-500' }
];

export default function ClockInOutCard({ userEmail, activeEntry, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeEntry) {
      console.log('Active entry received:', {
        id: activeEntry.id,
        category: activeEntry.category,
        employee_email: activeEntry.employee_email,
        date: activeEntry.date,
        clock_in_time: activeEntry.clock_in_time,
        status: activeEntry.status,
        allKeys: Object.keys(activeEntry)
      });
    }
  }, [activeEntry]);

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolokalisering stöds inte'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=sv`
            );
            const data = await response.json();
            
            resolve({
              latitude,
              longitude,
              address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            });
          } catch (error) {
            resolve({
              latitude,
              longitude,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            });
          }
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleClockIn = async () => {
    if (!selectedCategory || !userEmail) {
      alert('Kunde inte identifiera användare. Vänligen ladda om sidan.');
      return;
    }
    
    setLoading(true);
    
    try {
      let location;
      try {
        location = await getLocation();
      } catch (locError) {
        console.warn('Could not get location, continuing without:', locError);
        location = null;
      }
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const entryData = {
        employee_email: userEmail,
        date: today,
        category: selectedCategory,
        clock_in_time: new Date().toISOString(),
        status: 'active'
      };
      
      if (location) {
        entryData.clock_in_location = location;
      }
      
      await base44.entities.TimeEntry.create(entryData);
      
      setShowCategorySelect(false);
      setSelectedCategory(null);
      onUpdate();
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Kunde inte stämpla in: ' + error.message);
    }
    
    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeEntry) {
      alert('Ingen aktiv instämpling hittades');
      return;
    }
    
    if (!activeEntry.category || !activeEntry.employee_email || !activeEntry.date || !activeEntry.clock_in_time) {
      console.error('Missing required fields in activeEntry:', activeEntry);
      alert('Kunde inte stämpla ut: Obligatoriska fält saknas. Vänligen ladda om sidan.');
      return;
    }
    
    setLoading(true);
    
    try {
      let location;
      try {
        location = await getLocation();
      } catch (locError) {
        console.warn('Could not get location, continuing without:', locError);
        location = null;
      }
      
      const clockInTime = new Date(activeEntry.clock_in_time);
      const clockOutTime = new Date();
      const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

      const updateData = {
        employee_email: activeEntry.employee_email,
        date: activeEntry.date,
        category: activeEntry.category,
        clock_in_time: activeEntry.clock_in_time,
        clock_out_time: clockOutTime.toISOString(),
        total_hours: Number(totalHours.toFixed(2)),
        status: 'completed',
        break_minutes: activeEntry.break_minutes || 0
      };
      
      if (location) {
        updateData.clock_out_location = location;
      }
      
      if (activeEntry.clock_in_location) {
        updateData.clock_in_location = activeEntry.clock_in_location;
      }
      
      if (activeEntry.notes) {
        updateData.notes = activeEntry.notes;
      }
      
      console.log('Updating time entry with data:', updateData);
      await base44.entities.TimeEntry.update(activeEntry.id, updateData);
      
      await onUpdate();
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Kunde inte stämpla ut: ' + (error.message || 'Okänt fel'));
    } finally {
      setLoading(false);
    }
  };

  const getWorkDuration = () => {
    if (!activeEntry) return null;
    
    const start = new Date(activeEntry.clock_in_time);
    const now = new Date();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, formatted: `${hours}h ${minutes}m` };
  };

  const isOvertime = () => {
    const duration = getWorkDuration();
    if (!duration) return false;
    return duration.hours >= 10; // Varning efter 10 timmar
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find(c => c.id === categoryId) || categories[0];
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm mb-4">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-white/70">
            {format(currentTime, 'EEEE d MMMM yyyy', { locale: sv })}
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {activeEntry ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl">
              <LogIn className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-emerald-900">Instämplad</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs text-white ${getCategoryInfo(activeEntry.category).color}`}>
                    {getCategoryInfo(activeEntry.category).label}
                  </span>
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  {format(new Date(activeEntry.clock_in_time), 'HH:mm')}
                </p>
                {activeEntry.clock_in_location && (
                  <div className="flex items-start gap-1 mt-2 text-xs text-emerald-600">
                    <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{activeEntry.clock_in_location.address}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-900">{getWorkDuration()?.formatted}</p>
                <p className="text-xs text-emerald-600">arbetad tid idag</p>
              </div>
              </div>

              {isOvertime() && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-800">
                  Du har arbetat mer än ordinarie arbetstid idag. Glöm inte att stämpla ut.
                </p>
              </div>
              )}

              <Button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full h-14 bg-rose-600 hover:bg-rose-700 rounded-2xl text-base font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Stämplar ut...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5 mr-2" />
                  Stämpla ut
                </>
              )}
            </Button>
          </div>
        ) : showCategorySelect ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Välj arbetskategori</p>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      selectedCategory === category.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${category.color} flex items-center justify-center`}>
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-medium text-slate-900">{category.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCategorySelect(false);
                  setSelectedCategory(null);
                }}
                className="flex-1 h-12 rounded-2xl"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleClockIn}
                disabled={loading || !selectedCategory}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-2xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Stämplar in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Stämpla in
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowCategorySelect(true)}
            disabled={!userEmail}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-base font-medium disabled:opacity-50"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Stämpla in
          </Button>
        )}

        <p className="text-xs text-slate-500 text-center mt-3">
          <MapPin className="inline h-3 w-3 mr-1" />
          Din position registreras automatiskt
        </p>
      </CardContent>
    </Card>
  );
}