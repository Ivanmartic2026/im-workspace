import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ArrowLeft, Car, Fuel, Wrench, AlertCircle, Calendar, 
  FileText, User, MapPin, Hash, Zap, CreditCard, Edit, Trash2 
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors = {
  aktiv: "bg-emerald-100 text-emerald-700",
  service: "bg-amber-100 text-amber-700",
  skadad: "bg-rose-100 text-rose-700",
  avställd: "bg-slate-100 text-slate-700"
};

export default function VehicleDetails() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      const vehicles = await base44.entities.Vehicle.filter({ id: vehicleId });
      return vehicles[0];
    },
    enabled: !!vehicleId,
  });

  const { data: fuelLogs = [] } = useQuery({
    queryKey: ['fuelLogs', vehicleId],
    queryFn: () => base44.entities.FuelLog.filter({ vehicle_id: vehicleId }, '-date', 50),
    enabled: !!vehicleId,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ['issues', vehicleId],
    queryFn: () => base44.entities.MaintenanceIssue.filter({ vehicle_id: vehicleId }, '-created_date', 50),
    enabled: !!vehicleId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  if (isLoading || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const assignedEmployee = employees.find(e => e.user_email === vehicle.assigned_driver);
  const activeIssues = issues.filter(i => !['klar', 'avbruten'].includes(i.status));
  const recentFuelLogs = fuelLogs.slice(0, 5);

  const handleDelete = async () => {
    try {
      await base44.entities.Vehicle.delete(vehicleId);
      navigate(createPageUrl('Vehicles'));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Kunde inte ta bort fordonet');
    }
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
          <div className="flex items-center justify-between mb-4">
            <Link to={createPageUrl('Vehicles')}>
              <Button variant="ghost" size="sm" className="-ml-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            {user?.role === 'admin' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(createPageUrl('EditVehicle') + `?id=${vehicleId}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Redigera
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Vehicle Image & Main Info */}
          <Card className="border-0 shadow-md overflow-hidden mb-6">
            {vehicle.image_url ? (
              <div className="h-48 overflow-hidden bg-slate-100">
                <img 
                  src={vehicle.image_url} 
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <Car className="h-20 w-20 text-slate-400" />
              </div>
            )}
            
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{vehicle.registration_number}</h1>
                  <p className="text-slate-500 mt-1">
                    {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                  </p>
                </div>
                <Badge className={`${statusColors[vehicle.status]} border-0`}>
                  {vehicle.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Fuel className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{vehicle.fuel_type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{vehicle.current_mileage?.toLocaleString()} km</span>
                </div>
                {vehicle.is_pool_vehicle && (
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Poolbil</span>
                  </div>
                )}
                {assignedEmployee && !vehicle.is_pool_vehicle && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 truncate">{assignedEmployee.user_email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          {(vehicle.next_service_date || vehicle.next_inspection_date) && (
            <Card className="border-0 shadow-sm mb-6 bg-amber-50 border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Kommande
                </h3>
                <div className="space-y-1 text-sm">
                  {vehicle.next_service_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700">Nästa service</span>
                      <span className="font-medium text-amber-900">
                        {format(new Date(vehicle.next_service_date), "d MMM yyyy", { locale: sv })}
                      </span>
                    </div>
                  )}
                  {vehicle.next_inspection_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700">Besiktning</span>
                      <span className="font-medium text-amber-900">
                        {format(new Date(vehicle.next_inspection_date), "d MMM yyyy", { locale: sv })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-2xl grid grid-cols-3">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:shadow-sm">
              Översikt
            </TabsTrigger>
            <TabsTrigger value="fuel" className="rounded-xl data-[state=active]:shadow-sm">
              Tankningar
            </TabsTrigger>
            <TabsTrigger value="issues" className="rounded-xl data-[state=active]:shadow-sm">
              Ärenden {activeIssues.length > 0 && `(${activeIssues.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-4">
            {/* Vehicle Info */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Fordonsinformation</h3>
                <div className="space-y-3">
                  {vehicle.vin && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">VIN</span>
                      <span className="font-medium text-slate-900">{vehicle.vin}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Fordonstyp</span>
                    <span className="font-medium text-slate-900">{vehicle.vehicle_type}</span>
                  </div>
                  {vehicle.fuel_card_provider && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Tankkort</span>
                      <span className="font-medium text-slate-900">{vehicle.fuel_card_provider}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            {(vehicle.insurance_document_url || vehicle.lease_document_url || vehicle.manual_url) && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Dokument</h3>
                  <div className="space-y-2">
                    {vehicle.insurance_document_url && (
                      <a 
                        href={vehicle.insurance_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Försäkring</span>
                      </a>
                    )}
                    {vehicle.lease_document_url && (
                      <a 
                        href={vehicle.lease_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Leasingavtal</span>
                      </a>
                    )}
                    {vehicle.manual_url && (
                      <a 
                        href={vehicle.manual_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Manual</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="fuel" className="mt-6 space-y-3">
            {recentFuelLogs.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Fuel className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Inga tankningar registrerade</p>
                </CardContent>
              </Card>
            ) : (
              recentFuelLogs.map((log, idx) => (
                <Card key={log.id} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {format(new Date(log.date), "d MMM yyyy 'kl' HH:mm", { locale: sv })}
                        </p>
                        {log.station && (
                          <p className="text-xs text-slate-500 mt-0.5">{log.station}</p>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-slate-900">{log.amount} kr</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {log.liters && (
                        <span>{log.liters} L</span>
                      )}
                      {log.price_per_liter && (
                        <span>{log.price_per_liter} kr/L</span>
                      )}
                      <span>{log.mileage?.toLocaleString()} km</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="issues" className="mt-6 space-y-3">
            {issues.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Inga ärenden</p>
                </CardContent>
              </Card>
            ) : (
              issues.map((issue) => (
                <Card key={issue.id} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{issue.title}</h3>
                      <Badge variant="outline" className={
                        issue.status === 'klar' ? 'bg-emerald-100 text-emerald-700' :
                        issue.status === 'ny' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {issue.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{issue.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{issue.issue_type}</span>
                      <span>{format(new Date(issue.created_date), "d MMM", { locale: sv })}</span>
                      {issue.severity && (
                        <Badge variant="outline" className={
                          issue.severity === 'måste_stanna' ? 'border-rose-200 text-rose-600' :
                          issue.severity === 'bör_ej_köras' ? 'border-amber-200 text-amber-600' :
                          'border-slate-200 text-slate-600'
                        }>
                          {issue.severity.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort fordon</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort {vehicle.registration_number}? Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}