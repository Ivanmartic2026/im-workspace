import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ManualReportSender() {
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const handleSendWeeklySummary = async () => {
    setSending(true);
    try {
      const response = await base44.functions.invoke('sendWeeklySummary', {});
      
      toast.success('Veckorapport skickad!', {
        description: `Rapport skickad till info@imvision.se`
      });
      
      setLastSent({
        type: 'weekly',
        timestamp: new Date(),
        success: true,
        details: response.data
      });
    } catch (error) {
      console.error('Error sending weekly summary:', error);
      toast.error('Kunde inte skicka veckorapport', {
        description: error.message
      });
      setLastSent({
        type: 'weekly',
        timestamp: new Date(),
        success: false,
        error: error.message
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-slate-600" />
            Manuell rapportering
          </CardTitle>
          <CardDescription>
            Skicka rapporter manuellt till info@imvision.se
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weekly Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Veckosammanställning
                </h3>
                <p className="text-sm text-slate-600">
                  Skickar rapport för förra veckan med alla tidrapporter, medarbetare och projekt
                </p>
              </div>
              <Badge variant="outline" className="bg-white/80 text-blue-700 border-blue-200">
                Förra veckan
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSendWeeklySummary}
                disabled={sending}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Skicka veckorapport
                  </>
                )}
              </Button>

              {lastSent && lastSent.type === 'weekly' && (
                <div className="flex items-center gap-2 text-sm">
                  {lastSent.success ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-slate-600">
                        Skickad {lastSent.timestamp.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      <span className="text-rose-600 text-xs">Misslyckades</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {lastSent && lastSent.type === 'weekly' && lastSent.success && lastSent.details?.summary && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-3 bg-white/80 rounded-lg border border-blue-100"
              >
                <p className="text-xs font-semibold text-slate-700 mb-2">Sammanfattning:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">
                      {lastSent.details.summary.totalHours.toFixed(1)}h
                    </div>
                    <div className="text-xs text-slate-500">Totalt timmar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">
                      {lastSent.details.summary.totalEmployees}
                    </div>
                    <div className="text-xs text-slate-500">Medarbetare</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">
                      {lastSent.details.summary.totalProjects}
                    </div>
                    <div className="text-xs text-slate-500">Projekt</div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Info Card */}
          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-1">Automatisk rapportering</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Veckorapporten skickas automatiskt varje måndag kl 08:00. 
                    Projektrapporter skickas automatiskt när tid registreras på projekt med tidslinje.
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    E-post: <span className="font-mono font-semibold">info@imvision.se</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}