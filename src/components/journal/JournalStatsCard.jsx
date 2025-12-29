import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Navigation, Clock, Briefcase, Home, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function JournalStatsCard({ stats }) {
  const statsItems = [
    {
      label: 'Total sträcka',
      value: `${stats.totalDistance.toFixed(1)} km`,
      icon: Navigation,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Total tid',
      value: `${Math.round(stats.totalDuration / 60)} h`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Tjänsteresor',
      value: stats.businessTrips,
      icon: Briefcase,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      label: 'Privatresor',
      value: stats.privateTrips,
      icon: Home,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {statsItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${item.bgColor}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-lg font-bold text-slate-900">{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
      
      {stats.actionRequired > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-2"
        >
          <Card className="border-0 shadow-sm bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {stats.actionRequired} {stats.actionRequired === 1 ? 'resa kräver' : 'resor kräver'} åtgärd
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    GPS-resor utan ifylld körjournal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}