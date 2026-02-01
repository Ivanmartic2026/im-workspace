import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, Loader2, LogIn, LogOut, Coffee, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import ProjectAllocationEditor from "./ProjectAllocationEditor";



export default function ClockInOutCard({ userEmail, activeEntry, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [onBreak, setOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState(null);
  const [showProjectAllocation, setShowProjectAllocation] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const saved = localStorage.getItem('lastSelectedProjectId');
    return saved || null;
  });
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ name: '', project_code: '' });

  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const all = await base44.entities.Project.list();
      return all.filter(p => p.status === 'pågående');
    },
    initialData: []
  });



  const handleCreateProject = async () => {
    if (!newProjectData.name || !newProjectData.project_code) {
      alert('Fyll i både projektnamn och projektkod');
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      const newProject = await base44.entities.Project.create({
        name: newProjectData.name,
        project_code: newProjectData.project_code,
        status: 'pågående',
        project_manager_email: user.email
      });
      
      await refetchProjects();
      setSelectedProjectId(newProject.id);
      localStorage.setItem('lastSelectedProjectId', newProject.id);
      setShowNewProjectForm(false);
      setNewProjectData({ name: '', project_code: '' });
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Kunde inte skapa projekt: ' + error.message);
    }
    setLoading(false);
  };

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
    if (!selectedProjectId) {
      alert('Du måste välja ett projekt innan du stämplar in');
      return;
    }

    setLoading(true);

    // Vänta på att userEmail blir tillgänglig
    let email = userEmail;
    let attempts = 0;
    while (!email && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      email = userEmail;
      attempts++;
    }

    if (!email) {
      alert('Kunde inte identifiera användare. Vänligen ladda om sidan.');
      setLoading(false);
      return;
    }
    
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
        employee_email: email,
        date: today,
        clock_in_time: new Date().toISOString(),
        status: 'active',
        breaks: []
      };
      
      if (location) {
        entryData.clock_in_location = location;
      }

      if (selectedProjectId) {
        entryData.project_allocations = [{
          project_id: selectedProjectId,
          hours: 0,
          category: 'interntid'
        }];
      }
      
      await base44.entities.TimeEntry.create(entryData);
      
      // Spara projekt för nästa gång
      localStorage.setItem('lastSelectedProjectId', selectedProjectId);
      onUpdate();
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Kunde inte stämpla in: ' + error.message);
    }
    
    setLoading(false);
  };

  const handleBreakToggle = async () => {
    if (!activeEntry) return;

    setLoading(true);
    try {
      if (!onBreak) {
        // Start break
        setOnBreak(true);
        setBreakStart(new Date());
      } else {
        // End break
        const breakEnd = new Date();
        const breakDuration = Math.floor((breakEnd - breakStart) / (1000 * 60));
        
        const newBreak = {
          start_time: breakStart.toISOString(),
          end_time: breakEnd.toISOString(),
          duration_minutes: breakDuration,
          type: 'rast'
        };

        const updatedBreaks = [...(activeEntry.breaks || []), newBreak];
        const totalBreakMinutes = updatedBreaks.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);

        await base44.entities.TimeEntry.update(activeEntry.id, {
          breaks: updatedBreaks,
          total_break_minutes: totalBreakMinutes
        });

        setOnBreak(false);
        setBreakStart(null);
        await onUpdate();
      }
    } catch (error) {
      console.error('Error toggling break:', error);
      alert('Kunde inte hantera rast: ' + error.message);
    }
    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeEntry) {
      alert('Ingen aktiv instämpling hittades');
      return;
    }

    // Om projekt redan är valt vid instämpling, stämpla ut direkt
    if (activeEntry.project_allocations && activeEntry.project_allocations.length > 0) {
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
        const totalBreakMinutes = activeEntry.total_break_minutes || 0;
        const netHours = totalHours - (totalBreakMinutes / 60);

        // Uppdatera befintlig project_allocation med faktisk arbetstid
        const updatedAllocations = activeEntry.project_allocations.map(alloc => ({
          ...alloc,
          hours: Number(netHours.toFixed(2))
        }));

        const updateData = {
          clock_out_time: clockOutTime.toISOString(),
          total_hours: Number(netHours.toFixed(2)),
          status: 'completed',
          project_allocations: updatedAllocations
        };
        
        if (location) {
          updateData.clock_out_location = location;
        }
        
        await base44.entities.TimeEntry.update(activeEntry.id, updateData);
        
        // Check project budget after completing time entry
        try {
          await base44.functions.invoke('checkProjectBudget', { time_entry_id: activeEntry.id });
        } catch (budgetError) {
          console.error('Error checking project budget:', budgetError);
        }
        
        await onUpdate();
      } catch (error) {
        console.error('Error clocking out:', error);
        alert('Kunde inte stämpla ut: ' + (error.message || 'Okänt fel'));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Annars visa projektfördelning
    // Först uppdatera med clock_out_time så tiden stannar
    setLoading(true);
    try {
      let location;
      try {
        location = await getLocation();
      } catch (locError) {
        console.warn('Could not get location, continuing without:', locError);
        location = null;
      }

      const updateData = {
        clock_out_time: new Date().toISOString()
      };

      if (location) {
        updateData.clock_out_location = location;
      }

      await base44.entities.TimeEntry.update(activeEntry.id, updateData);
      await onUpdate();

      await base44.entities.Notification.create({
        recipient_email: activeEntry.employee_email,
        type: 'time_correction_needed',
        title: 'Fördela arbetstid',
        message: 'Du har stämplat ut. Vänligen fördela din arbetstid på projekt.',
        priority: 'high',
        sent_via: ['app']
      });

      setShowProjectAllocation(true);
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Kunde inte stämpla ut: ' + (error.message || 'Okänt fel'));
    } finally {
      setLoading(false);
    }
    return;
  };

  const handleSaveProjectAllocation = async (allocations) => {
    if (!activeEntry) return;
    
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
      const clockOutTime = activeEntry.clock_out_time ? new Date(activeEntry.clock_out_time) : new Date();
      const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

      const totalBreakMinutes = activeEntry.total_break_minutes || 0;
      const netHours = totalHours - (totalBreakMinutes / 60);

      const updateData = {
        employee_email: activeEntry.employee_email,
        date: activeEntry.date,
        clock_in_time: activeEntry.clock_in_time,
        clock_out_time: clockOutTime.toISOString(),
        total_hours: Number(netHours.toFixed(2)),
        status: 'completed',
        breaks: activeEntry.breaks || [],
        total_break_minutes: totalBreakMinutes,
        project_allocations: allocations
      };

      // Skapa notifikation om projektfördelning slutförd
      await base44.entities.Notification.create({
        recipient_email: activeEntry.employee_email,
        type: 'system',
        title: 'Projektfördelning slutförd',
        message: `Du har fördelat ${netHours.toFixed(1)}h på ${allocations.length} projekt.`,
        priority: 'normal',
        sent_via: ['app']
      });
      
      if (location) {
        updateData.clock_out_location = location;
      }
      
      if (activeEntry.clock_in_location) {
        updateData.clock_in_location = activeEntry.clock_in_location;
      }

      if (activeEntry.notes) {
        updateData.notes = activeEntry.notes;
      }
      
      await base44.entities.TimeEntry.update(activeEntry.id, updateData);
      
      setShowProjectAllocation(false);
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



  if (showProjectAllocation && activeEntry) {
    const clockInTime = new Date(activeEntry.clock_in_time);
    const clockOutTime = activeEntry.clock_out_time ? new Date(activeEntry.clock_out_time) : new Date();
    const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
    const totalBreakMinutes = activeEntry.total_break_minutes || 0;
    const netHours = totalHours - (totalBreakMinutes / 60);

    const tempEntry = {
      ...activeEntry,
      total_hours: Number(netHours.toFixed(2)),
      clock_out_time: clockOutTime.toISOString()
    };

    return (
      <ProjectAllocationEditor
        timeEntry={tempEntry}
        projects={projects}
        onSave={handleSaveProjectAllocation}
        onCancel={() => setShowProjectAllocation(false)}
      />
    );
  }

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
                  {activeEntry.project_allocations && activeEntry.project_allocations.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500 text-white">
                      {projects.find(p => p.id === activeEntry.project_allocations[0]?.project_id)?.name || 'Projekt'}
                    </span>
                  )}
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
              onClick={handleBreakToggle}
              disabled={loading}
              variant="outline"
              className="w-full h-12 rounded-2xl"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <>
                  <Coffee className="w-4 h-4 mr-2" />
                  {onBreak ? 'Avsluta rast' : 'Ta rast'}
                </>
              )}
            </Button>

              <Button
              onClick={handleClockOut}
              disabled={loading || onBreak}
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
          ) : (
          <div className="space-y-4">
            {!showNewProjectForm ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold text-slate-900">Välj projekt</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewProjectForm(true)}
                      className="h-8 text-xs text-indigo-600"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Nytt
                    </Button>
                  </div>
                  
                  {projects.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                      <p className="text-sm text-slate-600 mb-2">Inga projekt ännu</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewProjectForm(true)}
                        className="h-9"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Skapa projekt
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={selectedProjectId || ""}
                      onValueChange={(value) => {
                        setSelectedProjectId(value || null);
                        if (value) {
                          localStorage.setItem('lastSelectedProjectId', value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Välj ett projekt (valfritt)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Inget projekt</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{project.name}</span>
                              <span className="text-xs text-slate-500">{project.project_code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedProjectId && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50 rounded-xl border border-emerald-200"
                    >
                      <p className="text-sm text-emerald-800 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Tid registreras på {projects.find(p => p.id === selectedProjectId)?.name}
                      </p>
                    </motion.div>
                  )}

                  {!selectedProjectId && projects.length > 0 && (
                    <p className="text-xs text-center text-rose-600 py-2 font-medium">
                      ⚠️ Du måste välja ett projekt innan instämpling
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-slate-900">Nytt projekt</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewProjectForm(false);
                      setNewProjectData({ name: '', project_code: '' });
                    }}
                    className="h-8 text-xs"
                  >
                    Avbryt
                  </Button>
                </div>
                <Input
                  placeholder="Projektnamn"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-12 text-base"
                />
                <Input
                  placeholder="Projektkod (t.ex. PRJ001)"
                  value={newProjectData.project_code}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, project_code: e.target.value }))}
                  className="h-12 text-base"
                />
                <Button
                  onClick={handleCreateProject}
                  disabled={loading || !newProjectData.name || !newProjectData.project_code}
                  className="w-full h-12 rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Skapar...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Skapa och välj projekt
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <Button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-lg font-semibold disabled:opacity-50 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Stämplar in...
                </>
              ) : (
                <>
                  <LogIn className="w-6 h-6 mr-2" />
                  Stämpla in
                </>
              )}
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-500 text-center mt-3">
          <MapPin className="inline h-3 w-3 mr-1" />
          Din position registreras automatiskt
        </p>
      </CardContent>
    </Card>
  );
}