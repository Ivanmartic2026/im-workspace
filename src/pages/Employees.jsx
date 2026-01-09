import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Users, Mail, UserPlus, Pencil, Trash2, Shield, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EmployeeModal from "@/components/employees/EmployeeModal";
import InviteModal from "@/components/employees/InviteModal";

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredEmployees = employees.filter(emp => {
    const user = users.find(u => u.email === emp.user_email);
    return (
      emp.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (employeeId) => base44.entities.Employee.delete(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setShowEmployeeModal(true);
  };

  const handleDeleteEmployee = (employee) => {
    if (window.confirm(`Är du säker på att du vill ta bort ${users.find(u => u.email === employee.user_email)?.full_name || employee.user_email}?`)) {
      deleteEmployeeMutation.mutate(employee.id);
    }
  };

  const handleModalClose = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Medarbetare</h1>
              <p className="text-sm text-slate-500 mt-1">{employees.length} medarbetare</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(true)}
                className="rounded-full h-11 px-5"
              >
                <Mail className="w-4 h-4 mr-2" />
                Bjud in
              </Button>
              <Button
                onClick={() => setShowEmployeeModal(true)}
                className="rounded-full h-11 px-5 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till
              </Button>
            </div>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök medarbetare..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-0 bg-white shadow-sm"
            />
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
                  ))}
                </div>
              ) : filteredEmployees.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Inga medarbetare hittades</p>
                  </CardContent>
                </Card>
              ) : (
                filteredEmployees.map((employee, idx) => {
                  const user = users.find(u => u.email === employee.user_email);
                  return (
                    <motion.div
                      key={employee.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link to={`${createPageUrl('EmployeeDetails')}?id=${employee.id}`}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                                  <span className="text-lg font-semibold text-slate-600">
                                    {user?.full_name?.charAt(0) || employee.user_email?.charAt(0)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-slate-900 truncate">
                                    {user?.full_name || employee.user_email}
                                  </h3>
                                  <p className="text-sm text-slate-500 truncate">{employee.job_title || 'Ingen titel'}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                    <span>{employee.department || 'Ingen avdelning'}</span>
                                    {employee.phone && <span>•</span>}
                                    {employee.phone && <span>{employee.phone}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEditEmployee(employee);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDeleteEmployee(employee);
                                  }}
                                  disabled={deleteEmployeeMutation.isPending}
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <ChevronRight className="h-8 w-8 text-slate-400 p-2" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <EmployeeModal
        open={showEmployeeModal}
        onClose={handleModalClose}
        employee={editingEmployee}
      />

      <InviteModal
        open={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }}
      />
    </div>
  );
}