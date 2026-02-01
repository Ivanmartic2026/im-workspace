import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fuel, Calendar, MapPin, DollarSign, Gauge } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function AllFuelLogs() {
  const { data: fuelLogs = [], isLoading } = useQuery({
    queryKey: ['all-fuel-logs'],
    queryFn: () => base44.entities.FuelLog.list('-date', 200)
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return 'Okänt fordon';
    return vehicle.registration_number || vehicle.gps_device_id || 'Okänt fordon';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (fuelLogs.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Fuel className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Inga tankningar registrerade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {fuelLogs.map((log) => {
        return (
          <Card key={log.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Fuel className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 mb-1">{getVehicleName(log.vehicle_id)}</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {log.date && format(new Date(log.date), 'd MMM yyyy HH:mm', { locale: sv })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-white">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {log.amount?.toFixed(2) || '0'} kr
                      </Badge>
                      {log.liters && (
                        <Badge variant="outline" className="bg-white">
                          {log.liters.toFixed(1)} L
                        </Badge>
                      )}
                      {log.mileage && (
                        <Badge variant="outline" className="bg-white">
                          <Gauge className="h-3 w-3 mr-1" />
                          {log.mileage} km
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pl-12 text-xs">
                {log.station && (
                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin className="h-3 w-3" />
                    <span>{log.station}</span>
                  </div>
                )}
                {log.price_per_liter && (
                  <div className="text-slate-600">
                    Pris/L: {log.price_per_liter.toFixed(2)} kr
                  </div>
                )}
                {log.consumption && (
                  <div className="text-slate-600">
                    Förbrukning: {log.consumption.toFixed(1)} l/100km
                  </div>
                )}
                {log.driver_email && (
                  <div className="text-slate-600">
                    Förare: {log.driver_email.split('@')[0]}
                  </div>
                )}
              </div>

              {log.notes && (
                <p className="text-sm text-slate-600 mt-3 pl-12 italic">
                  {log.notes}
                </p>
              )}

              {log.receipt_url && (
                <div className="mt-3 pl-12">
                  <img
                    src={log.receipt_url}
                    alt="Kvitto"
                    className="w-32 h-32 object-cover rounded-lg cursor-pointer"
                    onClick={() => window.open(log.receipt_url, '_blank')}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}