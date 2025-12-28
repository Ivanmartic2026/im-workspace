import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Palmtree, Timer } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaveBalanceCard({ vacationBalance = 25, flexBalance = 0 }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Palmtree className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Semester</p>
                <p className="text-2xl font-bold text-emerald-700">{vacationBalance} <span className="text-sm font-normal">dagar</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Flex</p>
                <p className="text-2xl font-bold text-blue-700">{flexBalance} <span className="text-sm font-normal">timmar</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}