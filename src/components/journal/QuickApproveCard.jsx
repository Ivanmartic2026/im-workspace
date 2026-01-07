import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation, CheckCircle, Edit, X, Sparkles, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const tripTypeConfig = {
  tjänst: { label: 'Tjänsteresa', color: 'bg-blue-100 text-blue-800' },
  privat: { label: 'Privatresa', color: 'bg-slate-100 text-slate-800' }
};

export default function QuickApproveCard({ entry, vehicle, onApprove, onEdit, onReject }) {
  const [loading, setLoading] = useState(false);
  const suggestion = entry.suggested_classification || {};
  const tripType = tripTypeConfig[entry.trip_type] || tripTypeConfig.tjänst;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(entry);
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = suggestion.confidence >= 0.8 ? 'text-emerald-600' :
                         suggestion.confidence >= 0.6 ? 'text-amber-600' : 'text-slate-600';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="border-2 border-indigo-200 shadow-lg bg-gradient-to-br from-white to-indigo-50">
        <CardContent className="p-5">
          {/* Header med AI-badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">
                  {vehicle?.registration_number || entry.registration_number}
                </h3>
                <Badge className={tripType.color}>{tripType.label}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Okänt fordon'}
              </p>
            </div>
            {suggestion.confidence && (
              <div className="text-right">
                <div className={`text-xl font-bold ${confidenceColor}`}>
                  {Math.round(suggestion.confidence * 100)}%
                </div>
                <p className="text-xs text-slate-500">säkerhet</p>
              </div>
            )}
          </div>

          {/* Resa detaljer */}
          <div className="space-y-2 mb-4 p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">
                {format(new Date(entry.start_time), 'PPp', { locale: sv })}
              </span>
            </div>

            {entry.start_location && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600 line-clamp-2">{entry.start_location.address}</span>
              </div>
            )}

            {entry.end_location && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600 line-clamp-2">{entry.end_location.address}</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-900">{entry.distance_km?.toFixed(1)} km</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-900">{Math.round(entry.duration_minutes || 0)} min</span>
              </div>
            </div>
          </div>

          {/* AI-förslag detaljer */}
          {entry.trip_type === 'tjänst' && (entry.purpose || entry.project_code || entry.customer) && (
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <p className="text-xs font-semibold text-indigo-900">AI-förslag:</p>
              </div>
              
              {entry.purpose && (
                <div className="mb-2">
                  <p className="text-xs text-indigo-700 font-medium">Syfte:</p>
                  <p className="text-sm text-indigo-900">{entry.purpose}</p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {entry.project_code && (
                  <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700">
                    Projekt: {entry.project_code}
                  </Badge>
                )}
                {entry.customer && (
                  <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700">
                    Kund: {entry.customer}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Resonemanget */}
          {suggestion.reasoning && (
            <div className="mb-4 text-xs text-slate-600 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-indigo-400"></div>
              Baserat på {suggestion.reasoning}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Godkänn & Skicka
            </Button>
            <Button
              onClick={() => onEdit(entry)}
              disabled={loading}
              variant="outline"
              className="flex-1 h-11"
            >
              <Edit className="h-4 w-4 mr-2" />
              Redigera
            </Button>
            <Button
              onClick={() => onReject(entry)}
              disabled={loading}
              variant="ghost"
              size="icon"
              className="h-11 w-11"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}