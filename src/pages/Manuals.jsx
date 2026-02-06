import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Plus, Filter, FileText, AlertCircle, CheckCircle2, Loader2, Download, Users } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import UploadManualModal from '@/components/manuals/UploadManualModal';
import ManualCard from '@/components/manuals/ManualCard';
import PullToRefresh from "@/components/mobile/PullToRefresh";

const categoryLabels = {
  produkt_teknik: 'Produkt & Teknik',
  arbetsrutiner: 'Arbetsrutiner',
  it_system: 'IT & System',
  hr: 'HR',
  varumarke_allmant: 'Varumärke & Allmänt'
};

export default function Manuals() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: manuals = [], isLoading, refetch: refetchManuals } = useQuery({
    queryKey: ['manuals'],
    queryFn: () => base44.entities.Manual.list('-created_date', 200),
  });

  const handleRefresh = async () => {
    await refetchManuals();
  };

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Filter manuals based on user access
  const accessibleManuals = manuals.filter(manual => {
    if (!user) return false;
    
    // Admin sees all
    if (user.role === 'admin') return true;
    
    // Public manuals are visible to all
    if (manual.is_public) return true;
    
    // Check if user is assigned
    if (manual.assigned_to?.includes(user.email)) return true;
    
    // Check department access
    const userEmployee = employees.find(e => e.user_email === user.email);
    if (userEmployee && manual.target_departments?.includes(userEmployee.department)) {
      return true;
    }
    
    return false;
  });

  // Apply filters
  const filteredManuals = accessibleManuals.filter(manual => {
    const matchesSearch = 
      manual.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      manual.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      manual.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || manual.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Separate parent and child manuals
  const parentManuals = filteredManuals.filter(m => !m.parent_manual_id);
  const childManualsMap = {};
  
  filteredManuals.forEach(m => {
    if (m.parent_manual_id) {
      if (!childManualsMap[m.parent_manual_id]) {
        childManualsMap[m.parent_manual_id] = [];
      }
      childManualsMap[m.parent_manual_id].push(m);
    }
  });

  // Categorize manuals
  const requiresAcknowledgment = filteredManuals.filter(m => 
    m.requires_acknowledgment && 
    !m.acknowledged_by?.some(a => a.email === user?.email)
  );

  const stats = {
    total: filteredManuals.length,
    pending: requiresAcknowledgment.length,
    acknowledged: filteredManuals.filter(m => 
      m.acknowledged_by?.some(a => a.email === user?.email)
    ).length
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 pb-24">
        <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      Manualer & Dokumentation
                    </h1>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {stats.total} tillgängliga manualer
                    </p>
                  </div>
                </div>
              </div>
              {user?.role === 'admin' && (
                <Button 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ladda upp manual
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Totalt</p>
                      <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                      <p className="text-xs text-slate-500 mt-1">tillgängliga</p>
                    </div>
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
                      <BookOpen className="h-8 w-8 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-1">Väntar</p>
                      <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                      <p className="text-xs text-amber-600 mt-1">att bekräfta</p>
                    </div>
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center shadow-inner">
                      <AlertCircle className="h-8 w-8 text-amber-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700 mb-1">Bekräftade</p>
                      <p className="text-3xl font-bold text-emerald-600">{stats.acknowledged}</p>
                      <p className="text-xs text-emerald-600 mt-1">manualer</p>
                    </div>
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-200 to-teal-200 flex items-center justify-center shadow-inner">
                      <CheckCircle2 className="h-8 w-8 text-emerald-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    placeholder="Sök manualer, taggar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla kategorier</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pending Acknowledgments */}
          {requiresAcknowledgment.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-xl mb-8 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full blur-3xl opacity-30" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900 mb-2 text-lg">
                        ⚠️ Bekräftelse krävs
                      </h3>
                      <p className="text-sm text-amber-800 mb-4">
                        {requiresAcknowledgment.length} {requiresAcknowledgment.length === 1 ? 'manual kräver' : 'manualer kräver'} att du bekräftar att du har läst och förstått innehållet.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {requiresAcknowledgment.slice(0, 3).map(manual => (
                          <Link key={manual.id} to={createPageUrl('ManualDetail') + `?id=${manual.id}`}>
                            <Button size="sm" className="bg-white hover:bg-amber-50 text-amber-900 border-2 border-amber-200 shadow-sm">
                              {manual.title}
                            </Button>
                          </Link>
                        ))}
                        {requiresAcknowledgment.length > 3 && (
                          <Badge className="bg-amber-200 text-amber-900 border-amber-300 shadow-sm">
                            +{requiresAcknowledgment.length - 3} till
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Manuals Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : filteredManuals.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga manualer hittades</h3>
                <p className="text-slate-500 text-sm">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Prova att ändra dina sökfilter' 
                    : 'Inga manualer finns tillgängliga än'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {parentManuals.map((parentManual, parentIndex) => {
                const children = childManualsMap[parentManual.id] || [];

                return (
                  <div key={parentManual.id}>
                    {/* Parent Manual */}
                    <div className="mb-4">
                      <Link to={createPageUrl('ManualDetail') + `?id=${parentManual.id}`}>
                        <div className="p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl border-2 border-indigo-300 cursor-pointer hover:shadow-lg transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-indigo-900">{parentManual.title}</h3>
                              {children.length > 0 && (
                                <p className="text-sm text-indigo-700">{children.length} innehållselement</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Child Manuals */}
                    {children.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 ml-0 md:ml-4">
                        {children
                          .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                          .map((childManual, childIndex) => (
                            <motion.div
                              key={childManual.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: childIndex * 0.05, duration: 0.3 }}
                            >
                              <ManualCard 
                                manual={childManual} 
                                user={user}
                                isAdmin={user?.role === 'admin'}
                              />
                            </motion.div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <UploadManualModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['manuals'] });
          setShowUploadModal(false);
        }}
      />
      </div>
    </PullToRefresh>
  );
}