import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Calendar, Car, Receipt } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function MyFuelLogs({ userEmail }) {
  const { data: fuelLogs = [], isLoading } = useQuery({
    queryKey: ['myFuelLogs', userEmail],
    queryFn: async () => {
      const logs = await base44.entities.FuelLog.filter({ driver_email: userEmail });
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!userEmail,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.registration_number || 'Okänt fordon';
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fuelLogs.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Fuel className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Inga tankningar registrerade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {fuelLogs.map((log) => (
        <Card key={log.id} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900">{getVehicleName(log.vehicle_id)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(log.date), "d MMM yyyy", { locale: sv })}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-600">
                    <Receipt className="h-3 w-3" />
                    <span>{log.amount} kr</span>
                  </div>
                </div>

                <div className="mt-2 flex gap-4 text-xs text-slate-500">
                  <span>{log.liters} liter</span>
                  {log.price_per_liter && (
                    <span>{log.price_per_liter.toFixed(2)} kr/l</span>
                  )}
                  <span>{log.mileage} km</span>
                </div>

                {log.station && (
                  <p className="text-xs text-slate-500 mt-1">{log.station}</p>
                )}
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-slate-900">{log.liters}L</div>
                {log.consumption && (
                  <div className="text-xs text-slate-500">{log.consumption.toFixed(1)} l/100km</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}