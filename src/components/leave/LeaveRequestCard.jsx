import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const typeLabels = {
  semester: "Semester",
  vab: "VAB",
  sjuk: "Sjukfrånvaro",
  tjänstledigt: "Tjänstledigt",
  föräldraledigt: "Föräldraledigt",
  annat: "Annat"
};

const typeColors = {
  semester: "bg-emerald-100 text-emerald-700",
  vab: "bg-amber-100 text-amber-700",
  sjuk: "bg-rose-100 text-rose-700",
  tjänstledigt: "bg-violet-100 text-violet-700",
  föräldraledigt: "bg-blue-100 text-blue-700",
  annat: "bg-slate-100 text-slate-700"
};

const statusConfig = {
  pending: {
    label: "Väntar på godkännande",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock
  },
  approved: {
    label: "Godkänd",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2
  },
  rejected: {
    label: "Avslagen",
    color: "bg-rose-100 text-rose-700 border-rose-200",
    icon: XCircle
  }
};

export default function LeaveRequestCard({ request, isManager, onApprove, onReject, index = 0, showEmployee = false }) {
  const status = statusConfig[request.status];
  const StatusIcon = status.icon;
  const days = request.days || differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="flex">
          <div className={`w-1.5 ${request.status === 'approved' ? 'bg-emerald-500' : request.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'}`} />
          <CardContent className="py-5 px-5 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${typeColors[request.type]} border-0 text-xs font-medium`}>
                    {typeLabels[request.type]}
                  </Badge>
                  <Badge variant="outline" className={`${status.color} text-xs`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                
                {showEmployee && (
                  <p className="font-medium text-slate-900 mt-2">{request.employee_email}</p>
                )}
                
                <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <span>
                    {format(new Date(request.start_date), "d MMM", { locale: sv })} 
                    {request.start_date !== request.end_date && ` – ${format(new Date(request.end_date), "d MMM", { locale: sv })}`}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-medium">{days} {days === 1 ? 'dag' : 'dagar'}</span>
                </div>
                
                {request.reason && (
                  <p className="text-sm text-slate-500 mt-2">{request.reason}</p>
                )}

                {request.review_comment && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Kommentar från chef:</p>
                    <p className="text-sm text-slate-700 mt-1">{request.review_comment}</p>
                  </div>
                )}
              </div>
            </div>

            {isManager && request.status === 'pending' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={() => onApprove(request.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Godkänn
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(request.id)}
                  className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-full"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Avslå
                </Button>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}