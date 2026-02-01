import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Search, Plus, Car, Filter, Fuel } from "lucide-react";
import VehicleCard from "@/components/vehicles/VehicleCard";
import QuickActionButtons from "@/components/vehicles/QuickActionButtons";
import FuelLogModal from "@/components/vehicles/FuelLogModal";
import ReportIssueModal from "@/components/vehicles/ReportIssueModal";
import ReportIncidentModal from "@/components/vehicles/ReportIncidentModal";
import BookServiceModal from "@/components/vehicles/BookServiceModal";
import MyFuelLogs from "@/components/vehicles/MyFuelLogs";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Vehicles() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('alla');
  const [activeModal, setActiveModal] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState('fordon');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUserAndEmployee = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData?.email) {
          const employees = await base44.entities.Employee.filter({ user_email: userData.email });
          if (employees.length > 0) {
            setEmployee(employees[0]);
          }
        }
      } catch (error) {
        setUser(null);
        setEmployee(null);
      }
    };
    
    fetchUserAndEmployee();
  }, []);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('registration_number', 100),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: gpsPositions } = useQuery({
    queryKey: ['gps-positions'],
    queryFn: async () => {
      try {
        const deviceIds = vehicles
          .filter(v => v.gps_device_id)
          .map(v => v.gps_device_id);
        
        if (deviceIds.length === 0) return {};

        const response = await base44.functions.invoke('gpsTracking', {
          action: 'getLastPosition',
          params: { deviceIds }
        });

        const positions = {};
        if (response.data?.records) {
          response.data.records.forEach(pos => {
            positions[pos.deviceid] = pos;
          });
        }
        return positions;
      } catch (error) {
        console.error('Failed to fetch GPS positions:', error);
        return {};
      }
    },
    enabled: vehicles.length > 0 && !!user,
    refetchInterval: 30000,
  });

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'alla' || vehicle.category === categoryFilter;
    
    // Check access: admins see all, regular users only see assigned vehicles
    const hasAccess = user?.role === 'admin' || 
      !employee?.assigned_vehicles || 
      vehicle.assigned_employees?.includes(user?.email) ||
      employee?.assigned_vehicles?.includes(vehicle.id);
    
    return matchesSearch && matchesCategory && hasAccess;
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
            <div className="flex gap-2">
              {user?.role === 'admin' && (
                <>
                  <Button 
                    onClick={() => navigate(createPageUrl('VehicleReports'))}
                    variant="outline"
                    className="rounded-full h-11 px-4 shadow-sm"
                  >
                    Rapporter
                  </Button>
                  <Button 
                    onClick={() => navigate(createPageUrl('AddVehicle'))}
                    className="rounded-full h-11 px-5 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="fordon" className="gap-2">
                <Car className="h-4 w-4" />
                Fordon
              </TabsTrigger>
              <TabsTrigger value="tankningar" className="gap-2">
                <Fuel className="h-4 w-4" />
                Mina tankningar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Actions */}
          {activeTab === 'fordon' && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Snabbåtgärder</h3>
              <QuickActionButtons onAction={handleQuickAction} />
            </div>
          )}

          {/* Category Filter */}
          {activeTab === 'fordon' && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {['alla', 'personbil', 'lätt lastbil', 'lastbil', 'skåpbil', 'specialfordon'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat === 'alla' ? 'Alla' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          )}

          {/* Search */}
          {activeTab === 'fordon' && (
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök fordon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-0 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-slate-200"
            />
          </div>
          )}
        </motion.div>

        {/* Content based on active tab */}
        {activeTab === 'tankningar' ? (
          <MyFuelLogs userEmail={user?.email} />
        ) : (
          /* Vehicle List */
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
                    gpsStatus={vehicle.gps_device_id && gpsPositions?.[vehicle.gps_device_id] ? {
                      online: gpsPositions[vehicle.gps_device_id].online === 1
                    } : null}
                  />
                </Link>
              ))
            )}
          </AnimatePresence>
        </div>
        )}
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

      <ReportIncidentModal
        open={activeModal === 'incident'}
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