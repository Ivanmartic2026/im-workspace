import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function ProjectDrivingJournal({ projectId }) {
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(p => p[0])
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['project-journal', projectId],
    queryFn: async () => {
      const allEntries = await base44.entities.DrivingJournalEntry.list();
      return allEntries.filter(entry => 
        entry.project_id === projectId || 
        (project?.project_code && entry.project_code === project.project_code)
      );
    },
    enabled: !!project,
    refetchInterval: 60000,
    initialData: []
  });

  const getTripTypeColor = (tripType) => {
    switch (tripType) {
      case 'tjänst':
        return 'bg-blue-100 text-blue-700';
      case 'privat':
        return 'bg-slate-100 text-slate-700';
      case 'väntar':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const totalDistance = journalEntries.reduce((sum, entry) => sum + (entry.distance_km || 0), 0);
  const totalTime = journalEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const avgDistance = journalEntries.length > 0 ? (totalDistance / journalEntries.length).toFixed(1) : 0;

  if (journalEntries.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4 text-slate-500" />
            Körjournal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-6">Ingen körjournal registrerad på projektet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="h-4 w-4 text-slate-500" />
          Körjournal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{totalDistance.toFixed(1)}</p>
            <p className="text-xs text-slate-600">km totalt</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{Math.round(totalTime / 60)}</p>
            <p className="text-xs text-slate-600">timmar</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{journalEntries.length}</p>
            <p className="text-xs text-slate-600">resor</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{avgDistance}</p>
            <p className="text-xs text-slate-600">km/resa</p>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="space-y-2">
          {journalEntries.slice(0, 5).map((entry) => (
            <div key={entry.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 text-sm">{entry.distance_km}km</span>
                    <Badge className={`text-xs ${getTripTypeColor(entry.trip_type)}`}>
                      {entry.trip_type}
                    </Badge>
                    {entry.status === 'pending_review' && (
                      <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50">
                        <AlertCircle className="h-2.5 w-2.5 mr-1" />
                        Granskas
                      </Badge>
                    )}
                  </div>
                  {entry.purpose && (
                    <p className="text-xs text-slate-600">{entry.purpose}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(entry.start_time), 'dd MMM yyyy HH:mm', { locale: sv })} • {Math.round(entry.duration_minutes || 0)} min
                </div>
                {entry.start_location?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
                    <span className="line-clamp-1">{entry.start_location.address}</span>
                  </div>
                )}
                {entry.end_location?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-red-600" />
                    <span className="line-clamp-1">{entry.end_location.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {journalEntries.length > 5 && (
          <p className="text-xs text-slate-500 text-center pt-2">
            +{journalEntries.length - 5} fler resor
          </p>
        )}
      </CardContent>
    </Card>
  );
}