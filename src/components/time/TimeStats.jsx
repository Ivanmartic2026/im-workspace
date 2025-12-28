import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, TrendingUp } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function TimeStats({ entries }) {
  const now = new Date();
  
  const weekStart = startOfWeek(now, { locale: sv });
  const weekEnd = endOfWeek(now, { locale: sv });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const calculateHours = (interval) => {
    return entries
      .filter(entry => {
        if (!entry.clock_in_time || entry.status !== 'completed') return false;
        const entryDate = parseISO(entry.clock_in_time);
        return isWithinInterval(entryDate, interval);
      })
      .reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  const weekHours = calculateHours({ start: weekStart, end: weekEnd });
  const monthHours = calculateHours({ start: monthStart, end: monthEnd });

  const categoryBreakdown = entries
    .filter(entry => entry.status === 'completed' && entry.total_hours)
    .reduce((acc, entry) => {
      const category = entry.category || 'interntid';
      acc[category] = (acc[category] || 0) + entry.total_hours;
      return acc;
    }, {});

  const categoryLabels = {
    support_service: "Support & Service",
    install: "Install",
    interntid: "Interntid"
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/80">Denna vecka</span>
              </div>
              <p className="text-2xl font-bold text-white">{weekHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/80">Denna månad</span>
              </div>
              <p className="text-2xl font-bold text-white">{monthHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {Object.keys(categoryBreakdown).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Fördelning per kategori</h4>
              <div className="space-y-2">
                {Object.entries(categoryBreakdown).map(([category, hours]) => {
                  const total = Object.values(categoryBreakdown).reduce((sum, h) => sum + h, 0);
                  const percentage = ((hours / total) * 100).toFixed(0);
                  
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{categoryLabels[category]}</span>
                        <span className="font-semibold text-slate-900">{hours.toFixed(1)}h ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-slate-500 to-slate-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}