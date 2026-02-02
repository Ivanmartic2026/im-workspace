import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, UserPlus, Mail, Briefcase, Calendar, Edit, Settings, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import EditUserModal from './EditUserModal';
import EditFeaturesModal from './EditFeaturesModal';

export default function EmployeeManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingFeatures, setEditingFeatures] = useState(null);
  const queryClient = useQueryClient();

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleRefresh = async () => {
    await Promise.all([refetchEmployees(), refetchUsers()]);
  };

  // Matcha employees med users och lägg till users utan employee-post
  const enrichedEmployees = employees.map(emp => {
    const user = users.find(u => u.email === emp.user_email);
    return {
      ...emp,
      full_name: user?.full_name || emp.user_email,
      role: user?.role || 'user',
      hasEmployeeRecord: true
    };
  });

  // Lägg till users som inte har employee-post
  const usersWithoutEmployee = users.filter(user => 
    !employees.some(emp => emp.user_email === user.email)
  ).map(user => ({
    id: user.id,
    user_email: user.email,
    full_name: user.full_name,
    role: user.role,
    department: 'Övrigt',
    hasEmployeeRecord: false
  }));

  const allEmployees = [...enrichedEmployees, ...usersWithoutEmployee];

  // Filtrera
  const filteredEmployees = allEmployees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.user_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Departments
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  // Stats
  const totalEmployees = allEmployees.length;
  const byDepartment = {};
  employees.forEach(emp => {
    const dept = emp.department || 'Övrigt';
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Totalt anställda</p>
                <p className="text-xl font-bold text-slate-900">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Avdelningar</p>
                <p className="text-xl font-bold text-slate-900">{Object.keys(byDepartment).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Chefer</p>
                <p className="text-xl font-bold text-slate-900">
                  {employees.filter(e => e.is_manager).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök anställda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-0 bg-white shadow-sm"
            />
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="h-12 px-4 rounded-2xl"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue placeholder="Välj avdelning" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla avdelningar</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee List */}
      <div className="space-y-3">
        {filteredEmployees.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Inga anställda hittades</p>
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee, idx) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                       <h3 className="font-semibold text-slate-900">
                         {employee.full_name}
                       </h3>
                       {!employee.hasEmployeeRecord && (
                         <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                           Ny användare
                         </span>
                       )}
                       {employee.is_manager && (
                         <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">
                           Chef
                         </span>
                       )}
                       {employee.role === 'admin' && (
                         <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                           Admin
                         </span>
                       )}
                      </div>
                      
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-3 w-3" />
                          <span>{employee.user_email}</span>
                        </div>
                        
                        {employee.job_title && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Briefcase className="h-3 w-3" />
                            <span>{employee.job_title}</span>
                          </div>
                        )}
                        
                        {employee.department && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Users className="h-3 w-3" />
                            <span>{employee.department}</span>
                          </div>
                        )}
                        
                        {employee.start_date && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-3 w-3" />
                            <span>Startade {employee.start_date}</span>
                          </div>
                        )}

                        {employee.assigned_features && employee.assigned_features.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {employee.assigned_features.slice(0, 3).map(feature => (
                              <span key={feature} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                                {feature}
                              </span>
                            ))}
                            {employee.assigned_features.length > 3 && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                                +{employee.assigned_features.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="text-right">
                        <div className="space-y-1">
                          <div>
                            <p className="text-xs text-slate-500">Arbetstid/dag</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {employee.normal_work_hours_per_day || 8}h
                            </p>
                          </div>
                          {employee.vacation_balance !== undefined && (
                            <div>
                              <p className="text-xs text-slate-500">Semester</p>
                              <p className="text-sm font-semibold text-emerald-600">
                                {employee.vacation_balance} dagar
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingFeatures(employee)}
                        className="h-8 w-8"
                        title="Hantera funktioner"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingEmployee(employee)}
                        className="h-8 w-8"
                        title="Redigera namn"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {editingEmployee && (
        <EditUserModal
          employee={editingEmployee}
          users={users}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      {editingFeatures && (
        <EditFeaturesModal
          employee={editingFeatures}
          onClose={() => setEditingFeatures(null)}
        />
      )}
    </div>
  );
}