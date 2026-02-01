import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wrench, Car, Ban, HelpCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const issueTypeIcons = {
  skada: AlertTriangle,
  tekniskt_fel: Wrench,
  trafikincident: Car,
  inbrott_stöld: Ban,
  annat: HelpCircle
};

const statusConfig = {
  ny: { label: 'Ny', color: 'bg-blue-100 text-blue-800', icon: Clock },
  pågår: { label: 'Pågår', color: 'bg-amber-100 text-amber-800', icon: Clock },
  väntar_verkstad: { label: 'Väntar verkstad', color: 'bg-purple-100 text-purple-800', icon: Clock },
  väntar_delar: { label: 'Väntar delar', color: 'bg-orange-100 text-orange-800', icon: Clock },
  väntar_attest: { label: 'Väntar attest', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  klar: { label: 'Klar', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  avbruten: { label: 'Avbruten', color: 'bg-slate-100 text-slate-800', icon: XCircle }
};

const severityConfig = {
  kan_köras: { label: 'Kan köras', color: 'bg-emerald-100 text-emerald-700' },
  bör_ej_köras: { label: 'Bör ej köras', color: 'bg-amber-100 text-amber-700' },
  måste_stanna: { label: 'Måste stanna', color: 'bg-rose-100 text-rose-700' }
};

export default function MyIssues({ userEmail }) {
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['myIssues', userEmail],
    queryFn: async () => {
      const allIssues = await base44.entities.MaintenanceIssue.list('-created_date', 100);
      return allIssues;
    }
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return 'Okänt fordon';
    return vehicle.registration_number || vehicle.gps_device_id || 'Okänt fordon';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Inga rapporterade ärenden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Alla rapporteringar</h3>
      {issues.map((issue, index) => {
        const IssueIcon = issueTypeIcons[issue.issue_type] || HelpCircle;
        const status = statusConfig[issue.status] || statusConfig.ny;
        const StatusIcon = status.icon;
        const severity = severityConfig[issue.severity] || severityConfig.kan_köras;

        return (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <IssueIcon className="h-5 w-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 mb-1">{issue.title}</h4>
                      <p className="text-sm text-slate-600 mb-2">{getVehicleName(issue.vehicle_id)}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        <Badge className={severity.color}>
                          {severity.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {issue.description && (
                  <p className="text-sm text-slate-600 mb-3 pl-12">
                    {issue.description}
                  </p>
                )}

                <div className="flex items-center justify-between pl-12 text-xs text-slate-500">
                  <span>
                    {issue.created_date && format(new Date(issue.created_date), 'd MMM yyyy', { locale: sv })}
                  </span>
                  {issue.priority && (
                    <Badge variant="outline" className="text-xs">
                      {issue.priority === 'akut' ? '🔴 Akut' : 
                       issue.priority === 'hög' ? '🟠 Hög' : 
                       issue.priority === 'normal' ? '🟢 Normal' : '⚪ Låg'}
                    </Badge>
                  )}
                </div>

                {issue.images?.length > 0 && (
                  <div className="flex gap-2 mt-3 pl-12">
                    {issue.images.slice(0, 3).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Bild ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ))}
                    {issue.images.length > 3 && (
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-500">
                        +{issue.images.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}