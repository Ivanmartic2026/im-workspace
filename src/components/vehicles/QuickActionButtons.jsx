import React from 'react';
import { Button } from "@/components/ui/button";
import { Fuel, Wrench, AlertCircle, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";

const actions = [
  { id: 'fuel', label: 'Tankning', icon: Fuel, color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'issue', label: 'Rapportera fel', icon: AlertCircle, color: 'bg-rose-500 hover:bg-rose-600' },
  { id: 'service', label: 'Boka service', icon: Wrench, color: 'bg-amber-500 hover:bg-amber-600' },
  { id: 'handover', label: 'Utlämning', icon: ArrowRightLeft, color: 'bg-violet-500 hover:bg-violet-600' },
];

export default function QuickActionButtons({ onAction }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Button
              onClick={() => onAction(action.id)}
              className={`w-full h-20 ${action.color} text-white border-0 shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2 rounded-2xl`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}