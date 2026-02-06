import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

export default function OnlineIndicator({ 
  isOnline = false, 
  isClockedIn = false, 
  showBadge = false,
  size = "sm" // "xs", "sm", "md"
}) {
  const sizeClasses = {
    xs: "h-2 w-2",
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3"
  };

  const dotSize = sizeClasses[size] || sizeClasses.sm;

  if (showBadge) {
    if (isClockedIn) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-medium">
          <Circle className={`${dotSize} mr-1 fill-emerald-500 text-emerald-500`} />
          Incheckad
        </Badge>
      );
    }
    if (isOnline) {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium">
          <Circle className={`${dotSize} mr-1 fill-blue-500 text-blue-500`} />
          Online
        </Badge>
      );
    }
    return null;
  }

  // Simple dot indicator
  if (isClockedIn) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`${dotSize} rounded-full bg-emerald-500 ring-2 ring-white shadow-sm`}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-full h-full rounded-full bg-emerald-400"
        />
      </motion.div>
    );
  }

  if (isOnline) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`${dotSize} rounded-full bg-blue-500 ring-2 ring-white shadow-sm`}
      />
    );
  }

  return (
    <div className={`${dotSize} rounded-full bg-slate-300 ring-2 ring-white`} />
  );
}