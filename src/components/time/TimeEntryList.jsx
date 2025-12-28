import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const categoryColors = {
  support_service: "bg-blue-100 text-blue-700 border-blue-200",
  install: "bg-purple-100 text-purple-700 border-purple-200",
  interntid: "bg-slate-100 text-slate-700 border-slate-200"
};

const categoryLabels = {
  support_service: "Support & Service",
  install: "Install",
  interntid: "Interntid"
};

export default function TimeEntryList({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Inga tidrapporter än</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const clockIn = parseISO(entry.clock_in_time);
        const clockOut = entry.clock_out_time ? parseISO(entry.clock_out_time) : null;
        
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-900">
                      {format(clockIn, 'd MMM yyyy', { locale: sv })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${categoryColors[entry.category]}`}>
                      {categoryLabels[entry.category]}
                    </Badge>
                    <Badge variant={entry.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {entry.status === 'completed' ? 'Avslutat' : 'Pågående'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Instämpling</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {format(clockIn, 'HH:mm')}
                    </p>
                    {entry.clock_in_location && (
                      <div className="flex items-start gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{entry.clock_in_location.address?.split(',')[0]}</span>
                      </div>
                    )}
                  </div>

                  {clockOut ? (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Utstämpling</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {format(clockOut, 'HH:mm')}
                      </p>
                      {entry.clock_out_location && (
                        <div className="flex items-start gap-1 text-xs text-slate-500 mt-1">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{entry.clock_out_location.address?.split(',')[0]}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Badge variant="secondary" className="text-xs">Pågår</Badge>
                    </div>
                  )}
                </div>

                {entry.total_hours && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Arbetad tid</span>
                      <span className="text-sm font-bold text-slate-900">
                        {entry.total_hours.toFixed(2)} timmar
                      </span>
                    </div>
                  </div>
                )}

                {entry.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-600">{entry.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}