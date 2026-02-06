import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const typeLabels = {
  semester: "Semester",
  vab: "VAB",
  sjuk: "Sjukfrånvaro",
  tjänstledigt: "Tjänstledigt",
  föräldraledigt: "Föräldraledigt",
  flexuttag: "Flexuttag",
  annat: "Annat"
};

const typeColors = {
  semester: "bg-emerald-100 text-emerald-700",
  vab: "bg-amber-100 text-amber-700",
  sjuk: "bg-rose-100 text-rose-700",
  tjänstledigt: "bg-violet-100 text-violet-700",
  föräldraledigt: "bg-blue-100 text-blue-700",
  flexuttag: "bg-indigo-100 text-indigo-700",
  annat: "bg-slate-100 text-slate-700"
};

export default function AdminLeaveOverview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: allLeave = [] } = useQuery({
    queryKey: ['allLeaveRequests'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const getUserInfo = (email) => {
    const user = users.find(u => u.email === email);
    const employee = employees.find(e => e.user_email === email);
    return {
      name: user?.full_name || email,
      image: employee?.profile_image,
      department: employee?.department
    };
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredLeave = allLeave.filter(leave => {
    const userInfo = getUserInfo(leave.employee_email);
    const matchesSearch = searchQuery === '' || 
      userInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.employee_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    const matchesType = typeFilter === 'all' || leave.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    pending: allLeave.filter(l => l.status === 'pending').length,
    approved: allLeave.filter(l => l.status === 'approved').length,
    rejected: allLeave.filter(l => l.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Väntande</p>
                <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Godkända</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.approved}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-600 uppercase tracking-wide">Avslagna</p>
                <p className="text-2xl font-bold text-rose-700">{stats.rejected}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600" />
            Filtrera ansökningar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Sök anställd..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                <SelectItem value="pending">Väntande</SelectItem>
                <SelectItem value="approved">Godkända</SelectItem>
                <SelectItem value="rejected">Avslagna</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla typer</SelectItem>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            Alla ansökningar ({filteredLeave.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLeave.map((leave, idx) => {
              const userInfo = getUserInfo(leave.employee_email);
              return (
                <motion.div
                  key={leave.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userInfo.image} />
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-sm">
                        {getInitials(userInfo.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900">{userInfo.name}</p>
                        {userInfo.department && (
                          <Badge variant="outline" className="text-xs">
                            {userInfo.department}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(leave.start_date), 'd MMM', { locale: sv })} - {format(new Date(leave.end_date), 'd MMM yyyy', { locale: sv })}
                        </span>
                        <span>•</span>
                        <span>{leave.days || 0} dagar</span>
                      </div>
                      {leave.reason && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{leave.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${typeColors[leave.type]} border-0`}>
                      {typeLabels[leave.type]}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={
                        leave.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        leave.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }
                    >
                      {leave.status === 'pending' ? 'Väntande' : leave.status === 'approved' ? 'Godkänd' : 'Avslagen'}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
            {filteredLeave.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Inga ansökningar matchar filtret</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}