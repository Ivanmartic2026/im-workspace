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

const categoryLabels = {
  produkt: 'Produkt',
  säkerhet: 'Säkerhet',
  hr_policy: 'HR & Policy',
  it_system: 'IT-system',
  fordon: 'Fordon',
  arbetsrutiner: 'Arbetsrutiner',
  allmänt: 'Allmänt'
};

export default function Manuals() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: manuals = [], isLoading } = useQuery({
    queryKey: ['manuals'],
    queryFn: () => base44.entities.Manual.list('-created_date', 200),
  });

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
    const matchesPriority = priorityFilter === 'all' || manual.priority === priorityFilter;
    
    return matchesSearch && matchesCategory && matchesPriority;
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manualer & Dokumentation</h1>
              <p className="text-sm text-slate-500 mt-1">
                {stats.total} tillgängliga manualer
              </p>
            </div>
            {user?.role === 'admin' && (
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ladda upp manual
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Totalt</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Väntar på bekräftelse</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Bekräftade</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.acknowledged}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Sök manualer, taggar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla kategorier</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prioritet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alla prioriteter</SelectItem>
                    <SelectItem value="kritisk">Kritisk</SelectItem>
                    <SelectItem value="hög">Hög</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="låg">Låg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pending Acknowledgments */}
          {requiresAcknowledgment.length > 0 && (
            <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-500">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-1">
                      Bekräftelse krävs
                    </h3>
                    <p className="text-sm text-amber-700 mb-3">
                      {requiresAcknowledgment.length} {requiresAcknowledgment.length === 1 ? 'manual kräver' : 'manualer kräver'} att du bekräftar att du har läst och förstått innehållet.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {requiresAcknowledgment.slice(0, 3).map(manual => (
                        <Link key={manual.id} to={createPageUrl('ManualDetail') + `?id=${manual.id}`}>
                          <Button size="sm" variant="outline" className="bg-white">
                            {manual.title}
                          </Button>
                        </Link>
                      ))}
                      {requiresAcknowledgment.length > 3 && (
                        <Badge variant="outline" className="bg-white">
                          +{requiresAcknowledgment.length - 3} till
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredManuals.map(manual => (
                <ManualCard 
                  key={manual.id} 
                  manual={manual} 
                  user={user}
                  isAdmin={user?.role === 'admin'}
                />
              ))}
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
  );
}