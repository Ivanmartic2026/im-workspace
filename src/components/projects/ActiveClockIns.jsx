import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function ActiveClockIns({ projectId }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['active-clock-ins', projectId],
    queryFn: async () => {
      const allEntries = await base44.entities.TimeEntry.filter({
        status: 'active'
      });
      return allEntries.filter(entry =>
        entry.project_allocations?.some(alloc => alloc.project_id === projectId)
      );
    },
    refetchInterval: 30000,
    initialData: []
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: []
  });

  const getElapsedTime = (clockInTime) => {
    const start = new Date(clockInTime);
    const diff = Math.floor((currentTime - start) / 1000 / 60); // minuter
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  if (timeEntries.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            Aktiva instämplingar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-6">Ingen är instämplad på detta projekt</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-green-600" />
          Aktiva instämplingar ({timeEntries.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {timeEntries.map((entry) => {
            const user = users.find(u => u.email === entry.employee_email);
            const employee = employees.find(e => e.user_email === entry.employee_email);
            const allocation = entry.project_allocations?.find(a => a.project_id === projectId);

            return (
              <div key={entry.id} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
                      <User className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{user?.full_name}</p>
                      <p className="text-xs text-slate-500">{employee?.job_title}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 animate-pulse">
                    🔴 Aktiv
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  {allocation && (
                    <p className="text-slate-700">
                      <span className="font-semibold">{allocation.category}</span> • {allocation.hours}h planerad
                    </p>
                  )}
                  <p className="text-slate-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Instämplad: {getElapsedTime(entry.clock_in_time)}
                  </p>
                  {entry.clock_in_location?.address && (
                    <p className="text-slate-600 flex items-start gap-1 line-clamp-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      {entry.clock_in_location.address}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}