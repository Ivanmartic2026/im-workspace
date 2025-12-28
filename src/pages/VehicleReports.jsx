import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  AlertTriangle, Wrench, Car, Ban, Calendar, MapPin, 
  Clock, User, ArrowLeft, Filter
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

const issueTypeConfig = {
  skada: { label: 'Skada', icon: AlertTriangle, color: 'bg-rose-100 text-rose-700' },
  tekniskt_fel: { label: 'Tekniskt fel', icon: Wrench, color: 'bg-orange-100 text-orange-700' },
  trafikincident: { label: 'Trafikincident', icon: Car, color: 'bg-red-100 text-red-700' },
  inbrott_stöld: { label: 'Inbrott/Stöld', icon: Ban, color: 'bg-purple-100 text-purple-700' },
  service: { label: 'Service', icon: Wrench, color: 'bg-blue-100 text-blue-700' },
  annat: { label: 'Annat', icon: AlertTriangle, color: 'bg-slate-100 text-slate-700' }
};

const statusConfig = {
  ny: { label: 'Ny', color: 'bg-rose-100 text-rose-700' },
  pågår: { label: 'Pågår', color: 'bg-blue-100 text-blue-700' },
  väntar_verkstad: { label: 'Väntar verkstad', color: 'bg-amber-100 text-amber-700' },
  väntar_delar: { label: 'Väntar delar', color: 'bg-amber-100 text-amber-700' },
  väntar_attest: { label: 'Väntar attest', color: 'bg-purple-100 text-purple-700' },
  klar: { label: 'Klar', color: 'bg-emerald-100 text-emerald-700' },
  avbruten: { label: 'Avbruten', color: 'bg-slate-100 text-slate-700' }
};

const severityConfig = {
  kan_köras: { label: 'Kan köras', color: 'border-emerald-200 text-emerald-700' },
  bör_ej_köras: { label: 'Bör ej köras', color: 'border-amber-200 text-amber-700' },
  måste_stanna: { label: 'Måste stanna', color: 'border-rose-200 text-rose-700' }
};

export default function VehicleReports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('incidents');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: allIssues = [], isLoading } = useQuery({
    queryKey: ['allIssues'],
    queryFn: () => base44.entities.MaintenanceIssue.list('-created_date', 100),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const incidents = allIssues.filter(issue => 
    issue.issue_type !== 'service'
  );

  const serviceBookings = allIssues.filter(issue => 
    issue.issue_type === 'service'
  );

  const filteredIncidents = statusFilter === 'all' 
    ? incidents 
    : incidents.filter(i => i.status === statusFilter);

  const filteredService = statusFilter === 'all' 
    ? serviceBookings 
    : serviceBookings.filter(s => s.status === statusFilter);

  const getVehicleInfo = (vehicleId) => {
    return vehicles.find(v => v.id === vehicleId);
  };

  const IssueCard = ({ issue, index }) => {
    const vehicle = getVehicleInfo(issue.vehicle_id);
    const Icon = issueTypeConfig[issue.issue_type]?.icon || AlertTriangle;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => navigate(createPageUrl('VehicleDetails') + `?id=${issue.vehicle_id}`)}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${issueTypeConfig[issue.issue_type]?.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 truncate">{issue.title}</h4>
                  <p className="text-sm text-slate-500">
                    {issue.registration_number || vehicle?.registration_number || 'Okänt fordon'}
                  </p>
                </div>
              </div>
              <Badge className={statusConfig[issue.status]?.color || 'bg-slate-100 text-slate-700'}>
                {statusConfig[issue.status]?.label || issue.status}
              </Badge>
            </div>

            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{issue.description}</p>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              {issue.incident_date && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{format(parseISO(issue.incident_date), "d MMM HH:mm", { locale: sv })}</span>
                </div>
              )}
              {issue.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{issue.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{issue.created_by}</span>
              </div>
              {issue.severity && (
                <Badge variant="outline" className={`text-xs ${severityConfig[issue.severity]?.color}`}>
                  {severityConfig[issue.severity]?.label}
                </Badge>
              )}
            </div>

            {issue.workshop_date && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-slate-600">
                  Verkstad: {format(new Date(issue.workshop_date), "d MMM yyyy", { locale: sv })}
                </span>
                {issue.workshop && (
                  <span className="text-slate-500">• {issue.workshop}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link to={createPageUrl('Vehicles')}>
            <Button variant="ghost" size="sm" className="-ml-2 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
          </Link>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Rapporter</h1>
              <p className="text-sm text-slate-500 mt-1">
                Händelser och service för fordon
              </p>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'ny', 'pågår', 'väntar_verkstad', 'klar'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status === 'all' ? 'Alla' : statusConfig[status]?.label || status}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-2xl grid grid-cols-2">
            <TabsTrigger value="incidents" className="rounded-xl data-[state=active]:shadow-sm">
              Rapporterade fel ({filteredIncidents.length})
            </TabsTrigger>
            <TabsTrigger value="service" className="rounded-xl data-[state=active]:shadow-sm">
              Bokad service ({filteredService.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="mt-6 space-y-3">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
                  ))}
                </div>
              ) : filteredIncidents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Inga rapporterade händelser</p>
                </motion.div>
              ) : (
                filteredIncidents.map((issue, idx) => (
                  <IssueCard key={issue.id} issue={issue} index={idx} />
                ))
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="service" className="mt-6 space-y-3">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
                  ))}
                </div>
              ) : filteredService.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Ingen bokad service</p>
                </motion.div>
              ) : (
                filteredService.map((issue, idx) => (
                  <IssueCard key={issue.id} issue={issue} index={idx} />
                ))
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}