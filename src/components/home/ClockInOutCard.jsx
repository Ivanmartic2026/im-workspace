import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock as ClockIcon, Loader2, MapPin, Briefcase } from "lucide-react";
import { useLanguage } from "@/components/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

export default function ClockInOutCard({ 
  activeTimeEntry, 
  selectedProjectId, 
  projects,
  onClockAction,
  loading 
}) {
  const { t } = useLanguage();
  const [optimisticState, setOptimisticState] = useState(null);
  
  const displayEntry = optimisticState || activeTimeEntry;

  const handleClick = async () => {
    // Optimistic update
    if (!displayEntry) {
      // Optimistically show clocked in state
      setOptimisticState({
        status: 'active',
        clock_in_time: new Date().toISOString(),
        project_allocations: selectedProjectId ? [{
          project_id: selectedProjectId,
          hours: 0
        }] : []
      });
    } else {
      // Optimistically show clocked out state
      setOptimisticState(null);
    }

    try {
      await onClockAction();
      // Clear optimistic state on success
      setOptimisticState(null);
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticState(null);
      throw error;
    }
  };

  return (
    <>
      {/* Active Clock-In Status */}
      <AnimatePresence mode="wait">
        {displayEntry && (
          <motion.div
            key="active-entry"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    {t('clocked_in')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {displayEntry.project_allocations && displayEntry.project_allocations.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                      <Briefcase className="w-4 h-4" />
                      <span className="font-medium">
                        {projects.find(p => p.id === displayEntry.project_allocations[0]?.project_id)?.name || t('project')}
                      </span>
                    </div>
                  )}
                  
                  {displayEntry.clock_in_location && (
                    <div className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2 font-medium">{displayEntry.clock_in_location.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clock In/Out Button */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-0">
          <Button
            onClick={handleClick}
            disabled={(!displayEntry && !selectedProjectId) || loading}
            className={`w-full h-16 text-lg font-semibold transition-all rounded-2xl ${
              displayEntry 
                ? 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800' 
                : selectedProjectId
                ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {displayEntry ? t('clocking_out') : t('clocking_in')}
              </>
            ) : (
              <>
                <ClockIcon className="h-5 w-5 mr-2" />
                {displayEntry ? t('clock_out') : t('clock_in')}
              </>
            )}
          </Button>
          {!displayEntry && !selectedProjectId && (
            <p className="text-xs text-center text-rose-600 dark:text-rose-400 py-2 font-medium">
              {t('must_select_project')}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}