import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, AlertTriangle, User } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function TeamPresence({ activeEntries, employees, anomalies }) {
  const activeEmployees = activeEntries.map(entry => {
    const employee = employees.find(e => e.user_email === entry.employee_email);
    return { ...entry, employee };
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Instämplade just nu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeEmployees.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Ingen är instämplad</p>
          ) : (
            activeEmployees.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 bg-emerald-50 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-medium">
                      {entry.employee?.user_email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{entry.employee?.user_email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-600">
                          Sedan {format(new Date(entry.clock_in_time), 'HH:mm')}
                        </span>
                      </div>
                      {entry.clock_in_location && (
                        <div className="flex items-start gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-slate-500 line-clamp-1">
                            {entry.clock_in_location.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">
                    {entry.category}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>

      {anomalies.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Avvikelser som kräver åtgärd
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalies.slice(0, 5).map((entry, index) => {
              const employee = employees.find(e => e.user_email === entry.employee_email);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 bg-amber-50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{employee?.user_email}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {format(new Date(entry.date), 'yyyy-MM-dd')}
                      </p>
                      <p className="text-xs text-amber-700 mt-1">{entry.anomaly_reason}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}