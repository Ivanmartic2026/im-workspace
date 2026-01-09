import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function OnboardingProgress({ tasks }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved').length;
  const criticalTasks = tasks.filter(t => t.is_critical);
  const completedCriticalTasks = criticalTasks.filter(t => t.status === 'completed' || t.status === 'approved').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const checklistItems = [
    {
      label: 'Kritiska uppgifter',
      completed: completedCriticalTasks,
      total: criticalTasks.length,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Alla uppgifter',
      completed: completedTasks,
      total: totalTasks,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-900">Din progress</h3>
            <span className="text-2xl font-bold text-indigo-600">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          {checklistItems.map((item, index) => {
            const Icon = item.icon;
            const isComplete = item.completed === item.total && item.total > 0;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 rounded-lg ${item.bgColor}`}
              >
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 className={`h-5 w-5 ${item.color}`} />
                  ) : (
                    <Clock className="h-5 w-5 text-slate-400" />
                  )}
                  <span className="font-medium text-slate-900">{item.label}</span>
                </div>
                <span className={`text-sm font-semibold ${isComplete ? item.color : 'text-slate-600'}`}>
                  {item.completed}/{item.total}
                </span>
              </motion.div>
            );
          })}
        </div>

        {progressPercentage === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-900">Grattis! Du har slutfört din onboarding! 🎉</span>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}