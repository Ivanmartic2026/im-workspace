import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Fuel, Wrench, Calendar, AlertTriangle, User } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const fuelTypeColors = {
  bensin: "bg-amber-100 text-amber-700",
  diesel: "bg-slate-100 text-slate-700",
  el: "bg-green-100 text-green-700",
  hybrid: "bg-blue-100 text-blue-700",
  "plugin-hybrid": "bg-cyan-100 text-cyan-700",
  annat: "bg-slate-100 text-slate-700"
};

const statusColors = {
  aktiv: "bg-emerald-100 text-emerald-700 border-emerald-200",
  service: "bg-amber-100 text-amber-700 border-amber-200",
  skadad: "bg-rose-100 text-rose-700 border-rose-200",
  avställd: "bg-slate-100 text-slate-700 border-slate-200"
};

const statusLabels = {
  aktiv: "Aktiv",
  service: "I service",
  skadad: "Skadad",
  avställd: "Avställd"
};

export default function VehicleCard({ vehicle, onClick, index = 0, employees = [] }) {
  const assignedEmployee = employees.find(e => e.user_email === vehicle.assigned_driver);
  
  const getUpcomingAlert = () => {
    const alerts = [];
    
    if (vehicle.next_inspection_date) {
      const daysUntil = differenceInDays(new Date(vehicle.next_inspection_date), new Date());
      if (daysUntil <= 30) {
        alerts.push({ type: 'inspection', days: daysUntil, urgent: daysUntil <= 7 });
      }
    }
    
    if (vehicle.next_service_date) {
      const daysUntil = differenceInDays(new Date(vehicle.next_service_date), new Date());
      if (daysUntil <= 30) {
        alerts.push({ type: 'service', days: daysUntil, urgent: daysUntil <= 7 });
      }
    }
    
    return alerts[0];
  };

  const alert = getUpcomingAlert();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card 
        className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden"
        onClick={onClick}
      >
        <div className="flex">
          {vehicle.image_url ? (
            <div className="w-32 h-32 flex-shrink-0 overflow-hidden bg-slate-100">
              <img 
                src={vehicle.image_url} 
                alt={`${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Car className="h-12 w-12 text-slate-400" />
            </div>
          )}
          
          <CardContent className="py-4 px-4 flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                  {vehicle.registration_number}
                </h3>
                <p className="text-sm text-slate-500 truncate">
                  {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
                </p>
              </div>
              <Badge variant="outline" className={`${statusColors[vehicle.status]} text-xs flex-shrink-0`}>
                {statusLabels[vehicle.status]}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Badge className={`${fuelTypeColors[vehicle.fuel_type]} border-0 text-xs`}>
                  {vehicle.fuel_type}
                </Badge>
              </div>
              
              {vehicle.is_pool_vehicle && (
                <Badge variant="outline" className="text-xs">
                  Poolbil
                </Badge>
              )}
              
              {vehicle.current_mileage && (
                <span className="flex items-center gap-1">
                  <span>{vehicle.current_mileage?.toLocaleString()} km</span>
                </span>
              )}
            </div>

            {assignedEmployee && !vehicle.is_pool_vehicle && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                <User className="h-3 w-3" />
                <span className="truncate">{assignedEmployee.user_email}</span>
              </div>
            )}

            {alert && (
              <div className={`flex items-center gap-1.5 mt-2 text-xs ${alert.urgent ? 'text-rose-600' : 'text-amber-600'}`}>
                <AlertTriangle className="h-3 w-3" />
                <span>
                  {alert.type === 'inspection' ? 'Besiktning' : 'Service'} om {alert.days} {alert.days === 1 ? 'dag' : 'dagar'}
                </span>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}