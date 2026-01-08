import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation, AlertTriangle, Edit, CheckCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const statusConfig = {
  pending_review: { label: 'Väntar på ifyllning', color: 'bg-amber-100 text-amber-800', icon: Clock },
  submitted: { label: 'Inskickad', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  approved: { label: 'Godkänd', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  requires_info: { label: 'Kräver mer info', color: 'bg-rose-100 text-rose-800', icon: AlertTriangle }
};

const tripTypeConfig = {
  tjänst: { label: 'Tjänsteresa', color: 'bg-blue-100 text-blue-800' },
  privat: { label: 'Privatresa', color: 'bg-slate-100 text-slate-800' },
  väntar: { label: 'Ej angiven', color: 'bg-amber-100 text-amber-800' }
};

export default function JournalEntryCard({ entry, vehicle, onEdit, onApprove, onRequestInfo, isAdmin, canEdit = true }) {
  const status = statusConfig[entry.status] || statusConfig.pending_review;
  const tripType = tripTypeConfig[entry.trip_type] || tripTypeConfig.väntar;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
        entry.is_anomaly ? 'border-l-4 border-l-rose-500' : ''
      }`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">
                  {vehicle?.registration_number || entry.registration_number}
                </h3>
                <Badge className={tripType.color}>{tripType.label}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Okänt fordon'}
              </p>
              {entry.driver_name && (
                <p className="text-xs text-slate-500 mt-1">Förare: {entry.driver_name}</p>
              )}
            </div>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">
                {format(new Date(entry.start_time), 'PPp', { locale: sv })}
              </span>
            </div>

            {/* Reseväg */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              {entry.start_location && (
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1.5 min-w-[60px]">
                    <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-600">Start:</span>
                  </div>
                  <span className="text-sm text-slate-700">{entry.start_location.address}</span>
                </div>
              )}

              {entry.end_location && (
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1.5 min-w-[60px]">
                    <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-600">Slut:</span>
                  </div>
                  <span className="text-sm text-slate-700">{entry.end_location.address}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">{entry.distance_km?.toFixed(1)} km</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">{Math.round(entry.duration_minutes || 0)} min</span>
              </div>
            </div>
          </div>

          {entry.purpose && (
            <div className="mb-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-700 mb-1">Syfte:</p>
              <p className="text-sm text-slate-600">{entry.purpose}</p>
            </div>
          )}

          {entry.project_code && (
            <div className="mb-3">
              <Badge variant="outline" className="text-xs">
                Projekt: {entry.project_code}
                {entry.customer && ` - ${entry.customer}`}
              </Badge>
            </div>
          )}

          {entry.is_anomaly && (
            <div className="mb-3 p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-rose-700">Avvikelse</p>
                  <p className="text-xs text-rose-600 mt-0.5">{entry.anomaly_reason}</p>
                </div>
              </div>
            </div>
          )}

          {entry.review_comment && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-700 mb-1">Kommentar från administratör:</p>
              <p className="text-sm text-blue-600">{entry.review_comment}</p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            {entry.status !== 'approved' && onEdit && (
              <Button
                onClick={() => onEdit(entry)}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Edit className="h-3 w-3 mr-2" />
                {entry.trip_type === 'väntar' ? 'Fyll i' : 'Redigera'}
              </Button>
            )}

            {isAdmin && entry.status === 'submitted' && (
              <>
                <Button
                  onClick={() => onApprove(entry)}
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Godkänn
                </Button>
                <Button
                  onClick={() => onRequestInfo(entry)}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Info className="h-3 w-3 mr-2" />
                  Kräv info
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}