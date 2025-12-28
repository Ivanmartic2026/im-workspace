import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Search, Plus, Car } from "lucide-react";
import VehicleCard from "@/components/vehicles/VehicleCard";
import QuickActionButtons from "@/components/vehicles/QuickActionButtons";
import FuelLogModal from "@/components/vehicles/FuelLogModal";
import ReportIssueModal from "@/components/vehicles/ReportIssueModal";
import BookServiceModal from "@/components/vehicles/BookServiceModal";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Vehicles() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('registration_number', 100),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const handleQuickAction = (actionId) => {
    setActiveModal(actionId);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
    queryClient.invalidateQueries({ queryKey: ['maintenanceIssues'] });
    setActiveModal(null);
    setSelectedVehicle(null);
  };

  const myVehicles = vehicles.filter(v => v.assigned_driver === user?.email);
  const defaultVehicle = myVehicles.length === 1 ? myVehicles[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Fordon</h1>
              <p className="text-sm text-slate-500 mt-1">{vehicles.length} fordon i registret</p>
            </div>
            {user?.role === 'admin' && (
              <Button 
                onClick={() => navigate(createPageUrl('AddVehicle'))}
                className="rounded-full h-11 px-5 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till
              </Button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Snabbåtgärder</h3>
            <QuickActionButtons onAction={handleQuickAction} />
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök fordon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-0 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-slate-200"
              />
              </div>
        </motion.div>

        {/* Vehicle List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Car className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Inga fordon hittades</p>
              </motion.div>
            ) : (
              filteredVehicles.map((vehicle, idx) => (
                <Link key={vehicle.id} to={createPageUrl('VehicleDetails') + `?id=${vehicle.id}`}>
                  <VehicleCard
                    vehicle={vehicle}
                    employees={employees}
                    index={idx}
                  />
                </Link>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <FuelLogModal
        open={activeModal === 'fuel'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleModalSuccess}
        vehicles={vehicles}
        selectedVehicle={selectedVehicle || defaultVehicle}
        userEmail={user?.email}
      />

      <ReportIssueModal
        open={activeModal === 'issue'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleModalSuccess}
        vehicles={vehicles}
        selectedVehicle={selectedVehicle || defaultVehicle}
        userEmail={user?.email}
      />

      <BookServiceModal
        open={activeModal === 'service'}
        onClose={() => setActiveModal(null)}
        onSuccess={handleModalSuccess}
        vehicles={vehicles}
        selectedVehicle={selectedVehicle || defaultVehicle}
        userEmail={user?.email}
      />
    </div>
  );
}