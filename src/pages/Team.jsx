import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users2 } from "lucide-react";
import EmployeeCard from "@/components/profile/EmployeeCard";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const departments = [
  "Alla", "Ledning", "HR", "Sälj", "Marknad", "IT", "Ekonomi", "Produktion", "Kundtjänst", "Övrigt"
];

const departmentColors = {
  Ledning: "bg-violet-100 text-violet-700",
  HR: "bg-emerald-100 text-emerald-700",
  Sälj: "bg-blue-100 text-blue-700",
  Marknad: "bg-pink-100 text-pink-700",
  IT: "bg-cyan-100 text-cyan-700",
  Ekonomi: "bg-amber-100 text-amber-700",
  Produktion: "bg-orange-100 text-orange-700",
  Kundtjänst: "bg-rose-100 text-rose-700",
  Övrigt: "bg-slate-100 text-slate-700"
};

export default function Team() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('Alla');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('department', 200),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const getUserByEmail = (email) => users.find(u => u.email === email);

  const filteredEmployees = employees.filter(emp => {
    const user = getUserByEmail(emp.user_email);
    const matchesSearch = 
      emp.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDepartment === 'Alla' || emp.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const groupedByDepartment = filteredEmployees.reduce((acc, emp) => {
    const dept = emp.department || 'Övrigt';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const selectedUser = selectedEmployee ? getUserByEmail(selectedEmployee.user_email) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Medarbetare</h1>
          <p className="text-sm text-slate-500">{employees.length} kollegor</p>

          {/* Search & Filter */}
          <div className="flex gap-3 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Sök namn, email eller roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-2xl border-0 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-slate-200"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[140px] h-12 rounded-2xl border-0 bg-white shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Employee List */}
        <AnimatePresence mode="popLayout">
          {loadingEmployees || loadingUsers ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Users2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Inga medarbetare hittades</p>
            </motion.div>
          ) : selectedDepartment === 'Alla' ? (
            <div className="space-y-8">
              {Object.entries(groupedByDepartment).map(([dept, emps]) => (
                <div key={dept}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`${departmentColors[dept]} border-0 text-xs`}>
                      {dept}
                    </Badge>
                    <span className="text-xs text-slate-400">{emps.length} personer</span>
                  </div>
                  <div className="space-y-3">
                    {emps.map((emp, idx) => (
                      <EmployeeCard
                        key={emp.id}
                        employee={emp}
                        user={getUserByEmail(emp.user_email)}
                        onClick={() => setSelectedEmployee(emp)}
                        index={idx}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployees.map((emp, idx) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  user={getUserByEmail(emp.user_email)}
                  onClick={() => setSelectedEmployee(emp)}
                  index={idx}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Employee Detail Modal */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEmployee && (
            <>
              <div className="flex flex-col items-center text-center pt-4 pb-2">
                <Avatar className="h-20 w-20 ring-4 ring-slate-100">
                  <AvatarImage src={selectedEmployee.profile_image} />
                  <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-xl font-medium">
                    {getInitials(selectedUser?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold text-slate-900 mt-4">
                  {selectedUser?.full_name || selectedEmployee.user_email}
                </h2>
                {selectedEmployee.job_title && (
                  <p className="text-slate-500 mt-1">{selectedEmployee.job_title}</p>
                )}
                <Badge className={`${departmentColors[selectedEmployee.department]} border-0 mt-2`}>
                  {selectedEmployee.department}
                </Badge>
              </div>

              <div className="space-y-4 mt-4">
                <a 
                  href={`mailto:${selectedEmployee.user_email}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{selectedEmployee.user_email}</p>
                  </div>
                </a>

                {selectedEmployee.phone && (
                  <a 
                    href={`tel:${selectedEmployee.phone}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Telefon</p>
                      <p className="text-sm font-medium text-slate-900">{selectedEmployee.phone}</p>
                    </div>
                  </a>
                )}

                {selectedEmployee.location && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Plats</p>
                      <p className="text-sm font-medium text-slate-900">{selectedEmployee.location}</p>
                    </div>
                  </div>
                )}

                {selectedEmployee.start_date && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Anställd sedan</p>
                      <p className="text-sm font-medium text-slate-900">
                        {format(new Date(selectedEmployee.start_date), "d MMMM yyyy", { locale: sv })}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEmployee.bio && (
                  <div className="p-4 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-500 mb-2">Om mig</p>
                    <p className="text-sm text-slate-700">{selectedEmployee.bio}</p>
                  </div>
                )}

                {selectedEmployee.skills?.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-500 mb-2">Kompetenser</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="bg-white">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}