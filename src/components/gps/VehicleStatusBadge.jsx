import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Activity, ParkingCircle, AlertCircle } from 'lucide-react';

export default function VehicleStatusBadge({ status }) {
  const statusConfig = {
    kör: {
      icon: Activity,
      label: 'Kör',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    långsamt: {
      icon: Activity,
      label: 'Långsamt',
      color: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    parkerad: {
      icon: ParkingCircle,
      label: 'Parkerad',
      color: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    okänd: {
      icon: AlertCircle,
      label: 'Okänd',
      color: 'bg-slate-100 text-slate-700 border-slate-200'
    }
  };

  const config = statusConfig[status] || statusConfig.okänd;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-xs gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}