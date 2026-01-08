import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Car, CheckSquare, Wrench, Route, Calendar, Users, Zap } from "lucide-react";

const availableWidgets = [
  { type: 'time_summary', name: 'Tidsoversikt', icon: Clock, description: 'Visa dina arbetstimmar och saldo' },
  { type: 'vehicle_status', name: 'Fordonsstatus', icon: Car, description: 'Senaste fordonsstatus' },
  { type: 'pending_approvals', name: 'Väntande godkännanden', icon: CheckSquare, description: 'Saker som behöver din åtgärd' },
  { type: 'upcoming_service', name: 'Kommande service', icon: Wrench, description: 'Fordon som snart behöver service' },
  { type: 'recent_trips', name: 'Senaste resor', icon: Route, description: 'Dina senaste körjournalsposter' },
  { type: 'leave_balance', name: 'Semestersaldo', icon: Calendar, description: 'Ditt semestesaldo och frånvaro' },
  { type: 'team_presence', name: 'Teamöversikt', icon: Users, description: 'Se vem som är på jobbet' },
  { type: 'quick_actions', name: 'Snabbåtgärder', icon: Zap, description: 'Genvägar till vanliga uppgifter' },
];

export default function WidgetSelector({ open, onClose, onSelect, existingTypes = [] }) {
  const available = availableWidgets.filter(w => !existingTypes.includes(w.type));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lägg till widget</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {available.map(widget => {
            const Icon = widget.icon;
            return (
              <button
                key={widget.type}
                onClick={() => {
                  onSelect(widget.type);
                  onClose();
                }}
                className="p-4 rounded-lg border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{widget.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{widget.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {available.length === 0 && (
          <p className="text-center text-slate-500 py-8">Alla tillgängliga widgets är redan tillagda</p>
        )}
      </DialogContent>
    </Dialog>
  );
}