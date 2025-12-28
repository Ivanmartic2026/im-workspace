import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, FolderOpen } from "lucide-react";
import DocumentCard from "@/components/documents/DocumentCard";
import { motion, AnimatePresence } from "framer-motion";

export default function Documents() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('alla');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-updated_date', 100),
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const handleAcknowledge = (docId) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc || !user) return;

    const acknowledged = doc.acknowledged_by || [];
    if (acknowledged.some(a => a.email === user.email)) return;

    updateDocMutation.mutate({
      id: docId,
      data: {
        acknowledged_by: [...acknowledged, {
          email: user.email,
          name: user.full_name,
          acknowledged_at: new Date().toISOString()
        }]
      }
    });
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'alla' || doc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Separate docs requiring acknowledgment
  const pendingDocs = filteredDocs.filter(d => 
    d.requires_acknowledgment && !d.acknowledged_by?.some(a => a.email === user?.email)
  );
  const otherDocs = filteredDocs.filter(d => 
    !d.requires_acknowledgment || d.acknowledged_by?.some(a => a.email === user?.email)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Dokument</h1>
          <p className="text-sm text-slate-500">Policyer, rutiner och mallar</p>

          {/* Search */}
          <div className="relative mt-6 mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök dokument..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-0 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-slate-200"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-2xl grid grid-cols-6">
              <TabsTrigger value="alla" className="rounded-xl text-xs data-[state=active]:shadow-sm">Alla</TabsTrigger>
              <TabsTrigger value="personalhandbok" className="rounded-xl text-xs data-[state=active]:shadow-sm">Handbok</TabsTrigger>
              <TabsTrigger value="policy" className="rounded-xl text-xs data-[state=active]:shadow-sm">Policy</TabsTrigger>
              <TabsTrigger value="rutin" className="rounded-xl text-xs data-[state=active]:shadow-sm">Rutin</TabsTrigger>
              <TabsTrigger value="mall" className="rounded-xl text-xs data-[state=active]:shadow-sm">Mall</TabsTrigger>
              <TabsTrigger value="övrigt" className="rounded-xl text-xs data-[state=active]:shadow-sm">Övrigt</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Pending Acknowledgments */}
        {pendingDocs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-medium text-amber-700">Kräver bekräftelse</span>
            </div>
            <div className="space-y-3">
              {pendingDocs.map((doc, idx) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onAcknowledge={handleAcknowledge}
                  currentUserEmail={user?.email}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Documents */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
                ))}
              </div>
            ) : otherDocs.length === 0 && pendingDocs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Inga dokument hittades</p>
              </motion.div>
            ) : (
              otherDocs.map((doc, idx) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onAcknowledge={handleAcknowledge}
                  currentUserEmail={user?.email}
                  index={idx}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}