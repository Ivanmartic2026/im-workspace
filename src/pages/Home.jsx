import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Bell, Sparkles, Users } from "lucide-react";
import NewsFeedCard from "@/components/news/NewsFeedCard";
import CreateNewsModal from "@/components/news/CreateNewsModal";
import CommentsModal from "@/components/news/CommentsModal";
import ClockInOutCard from "@/components/time/ClockInOutCard";
import PushPromptBanner from "@/components/notifications/PushPromptBanner";
import EditFeaturesModal from "@/components/admin/EditFeaturesModal";
import { Card, CardContent } from "@/components/ui/card";

import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('alla');
  const [editingFeatures, setEditingFeatures] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['newsPosts'],
    queryFn: () => base44.entities.NewsPost.list('-created_date', 50),
  });

  const { data: timeEntries = [], refetch: refetchTimeEntries } = useQuery({
    queryKey: ['timeEntries', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // Use list() to get ALL fields for each entry
      const allEntries = await base44.entities.TimeEntry.list();
      const userEntries = allEntries.filter(e => e.employee_email === user.email);
      console.log('Fetched time entries:', userEntries.length, 'entries');
      return userEntries;
    },
    enabled: !!user?.email
  });

  const activeTimeEntry = timeEntries.find(entry => entry.status === 'active');
  
  useEffect(() => {
    if (activeTimeEntry) {
      console.log('Active time entry with ALL fields:', {
        id: activeTimeEntry.id,
        employee_email: activeTimeEntry.employee_email,
        date: activeTimeEntry.date,
        category: activeTimeEntry.category,
        clock_in_time: activeTimeEntry.clock_in_time,
        status: activeTimeEntry.status,
        allKeys: Object.keys(activeTimeEntry)
      });
    }
  }, [activeTimeEntry]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: user?.role === 'admin'
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin'
  });

  const enrichedEmployees = employees.map(emp => {
    const u = users.find(usr => usr.email === emp.user_email);
    return {
      ...emp,
      full_name: u?.full_name || emp.user_email
    };
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NewsPost.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['newsPosts'] }),
  });

  const handleReact = (postId, reactionType) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !user) return;

    const reactions = post.reactions || { likes: [], hearts: [], celebrates: [] };
    const currentReactions = reactions[reactionType] || [];
    
    const hasReacted = currentReactions.includes(user.email);
    const newReactions = hasReacted
      ? currentReactions.filter(e => e !== user.email)
      : [...currentReactions, user.email];

    updatePostMutation.mutate({
      id: postId,
      data: {
        reactions: {
          ...reactions,
          [reactionType]: newReactions
        }
      }
    });
  };

  const handleAddComment = async (postId, content) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !user) return;

    const newComment = {
      id: Date.now().toString(),
      author_email: user.email,
      author_name: user.full_name,
      content,
      created_at: new Date().toISOString()
    };

    await updatePostMutation.mutateAsync({
      id: postId,
      data: {
        comments: [...(post.comments || []), newComment]
      }
    });

    setSelectedPost(prev => prev ? {
      ...prev,
      comments: [...(prev.comments || []), newComment]
    } : null);
  };

  const handleAcknowledge = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !user) return;

    const acknowledgment = {
      email: user.email,
      name: user.full_name,
      acknowledged_at: new Date().toISOString()
    };

    await updatePostMutation.mutateAsync({
      id: postId,
      data: {
        acknowledged_by: [...(post.acknowledged_by || []), acknowledgment]
      }
    });
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'alla' || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const importantPosts = filteredPosts.filter(p => p.is_important);
  const regularPosts = filteredPosts.filter(p => !p.is_important);

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
              <h1 className="text-2xl font-bold text-slate-900">Welcome to IM Workspace</h1>
              <p className="text-sm text-slate-500 mt-1">
                {user?.full_name || ''}
              </p>
            </div>
            {user?.role === 'admin' && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="rounded-full h-11 px-5 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ny nyhet
              </Button>
            )}
          </div>

          {/* Push Notification Prompt */}
          <PushPromptBanner user={user} />

          {/* Clock In/Out Card */}
          <div className="mb-6">
            <ClockInOutCard 
              userEmail={user?.email}
              activeEntry={activeTimeEntry}
              onUpdate={() => {
                refetchTimeEntries();
                queryClient.invalidateQueries({ queryKey: ['employees'] });
              }}
            />
          </div>

          {/* Employees Section - Admin only */}
          {user?.role === 'admin' && enrichedEmployees.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Anställda</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {enrichedEmployees.slice(0, 6).map(emp => (
                  <Card 
                    key={emp.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-0"
                    onClick={() => setEditingFeatures(emp)}
                  >
                    <CardContent className="p-3">
                      <p className="font-medium text-slate-900 text-sm truncate">{emp.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{emp.department || 'Ingen avdelning'}</p>
                      {emp.assigned_features && emp.assigned_features.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700">
                            {emp.assigned_features.length} funktioner
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </motion.div>

        {/* Important Posts */}
        {importantPosts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">Viktiga meddelanden</span>
            </div>
            <div className="space-y-4">
              {importantPosts.map(post => (
                <NewsFeedCard
                  key={post.id}
                  post={post}
                  onReact={handleReact}
                  onComment={setSelectedPost}
                  onAcknowledge={handleAcknowledge}
                  currentUserEmail={user?.email}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Posts */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
                ))}
              </div>
            ) : regularPosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Inga nyheter att visa</p>
              </motion.div>
            ) : (
              regularPosts.map(post => (
                <NewsFeedCard
                  key={post.id}
                  post={post}
                  onReact={handleReact}
                  onComment={setSelectedPost}
                  onAcknowledge={handleAcknowledge}
                  currentUserEmail={user?.email}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <CreateNewsModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['newsPosts'] })}
      />

      <CommentsModal
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        onAddComment={handleAddComment}
        currentUser={user}
      />

      {editingFeatures && (
        <EditFeaturesModal
          employee={editingFeatures}
          onClose={() => setEditingFeatures(null)}
        />
      )}
    </div>
  );
}