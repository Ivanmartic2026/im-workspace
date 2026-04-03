import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Briefcase, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function FortnoxProjekttid() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [formData, setFormData] = useState({
    projectNumber: '',
    projectName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: 0.5,
    description: '',
    reporter: ''
  });
  const [savingTime, setSavingTime] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current user
  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setFormData(prev => ({
        ...prev,
        reporter: u?.full_name || u?.email || ''
      }));
    });
  }, []);

  // Fetch Fortnox projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const response = await fetch('https://app--69455d52c9eab36b7d26cc74.base44.app/functions/getFortnoxProjectsList', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await response.json();
        setProjects(data || []);
      } catch (error) {
        console.error('Failed to fetch Fortnox projects:', error);
        toast.error('Kunde inte hämta projekt från Fortnox');
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  // Fetch ProjectTime entries for current user
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['projectTimeEntries', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ProjectTime.filter({ reporter: user.email }, '-date');
    },
    enabled: !!user?.email
  });

  const handleProjectChange = (projectNumber) => {
    const selected = projects.find(p => p.ProjectNumber === projectNumber);
    setFormData(prev => ({
      ...prev,
      projectNumber,
      projectName: selected?.Description || ''
    }));
  };

  const handleSaveTime = async (e) => {
    e.preventDefault();
    
    if (!formData.projectNumber || !formData.hours) {
      toast.error('Fyll i projekt och timmar');
      return;
    }

    setSavingTime(true);
    try {
      const response = await fetch('https://app--69455d52c9eab36b7d26cc74.base44.app/functions/receiveWorkspaceTime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectNumber: formData.projectNumber,
          projectName: formData.projectName,
          date: formData.date,
          hours: parseFloat(formData.hours),
          description: formData.description,
          reporter: formData.reporter
        })
      });

      if (!response.ok) throw new Error('Kunde inte spara tid');
      
      toast.success('Tid sparad!');
      
      // Reset form
      setFormData(prev => ({
        projectNumber: '',
        projectName: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        hours: 0.5,
        description: '',
        reporter: prev.reporter
      }));

      // Refresh time entries
      queryClient.invalidateQueries({ queryKey: ['projectTimeEntries'] });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Kunde inte spara tid');
    } finally {
      setSavingTime(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Projekttid</h1>
            <p className="text-slate-600">Logga tid på Fortnox-projekt och synkronisera med IM Lager</p>
          </div>

          {/* Form Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Logga projekttid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveTime} className="space-y-5">
                {/* Project Select */}
                <div className="space-y-2">
                  <Label>Projekt *</Label>
                  {loadingProjects ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      <span className="text-sm text-slate-500">Hämtar projekt...</span>
                    </div>
                  ) : (
                    <Select value={formData.projectNumber} onValueChange={handleProjectChange}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Välj projekt" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.ProjectNumber} value={project.ProjectNumber}>
                            {project.ProjectNumber} - {project.Description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Date and Hours Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Datum *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timmar *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={formData.hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                      className="h-11"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Beskrivning</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Vad gjorde du?"
                    className="h-11"
                  />
                </div>

                {/* Reporter */}
                <div className="space-y-2">
                  <Label>Rapportör</Label>
                  <Input
                    value={formData.reporter}
                    onChange={(e) => setFormData(prev => ({ ...prev, reporter: e.target.value }))}
                    placeholder="Ditt namn"
                    className="h-11"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={savingTime || loadingProjects}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800"
                >
                  {savingTime ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Spara tid
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Time Entries Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Dina tidsposter</CardTitle>
            </CardHeader>
            <CardContent>
              {timeEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Inga tidsposter ännu</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-3 font-semibold text-slate-900">Projekt</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-900">Datum</th>
                        <th className="text-right py-3 px-3 font-semibold text-slate-900">Timmar</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-900">Beskrivning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map(entry => (
                        <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-900">{entry.projectNumber}</span>
                            {entry.projectName && (
                              <p className="text-xs text-slate-500">{entry.projectName}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {format(new Date(entry.date), 'd MMM yyyy', { locale: sv })}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-900">
                            {entry.hours}h
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {entry.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}