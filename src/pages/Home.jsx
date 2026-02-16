import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Bell, Sparkles } from "lucide-react";
import NewsFeedCard from "@/components/news/NewsFeedCard";
import CreateNewsModal from "@/components/news/CreateNewsModal";
import CommentsModal from "@/components/news/CommentsModal";
import ViewNewsModal from "@/components/news/ViewNewsModal";
import PushPromptBanner from "@/components/notifications/PushPromptBanner";
import ImportantNewsAlert from "@/components/home/ImportantNewsAlert";
import ProjectSelector from "@/components/home/ProjectSelector";
import ClockInOutCard from "@/components/home/ClockInOutCard";
import VehicleTripsOverview from "@/components/home/VehicleTripsOverview";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/contexts/LanguageContext";
import PullToRefresh from "@/components/mobile/PullToRefresh";

export default function Home() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewPost, setViewPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('alla');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {
        base44.auth.redirectToLogin();
      })
      .finally(() => setIsAuthLoading(false));
  }, []);

  const { data: posts = [], isLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['newsPosts'],
    queryFn: () => base44.entities.NewsPost.list('-created_date', 50),
  });

  const handleRefresh = async () => {
    await Promise.all([
      refetchPosts(),
      refetchTimeEntries()
    ]);
  };

  const { data: timeEntries = [], refetch: refetchTimeEntries } = useQuery({
    queryKey: ['timeEntries', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allEntries = await base44.entities.TimeEntry.list();
      return allEntries.filter(e => e.employee_email === user.email);
    },
    enabled: !!user?.email
  });

  const { data: employee } = useQuery({
    queryKey: ['employee', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const employees = await base44.entities.Employee.filter({ user_email: user.email });
      return employees[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const all = await base44.entities.Project.list('-updated_date');
      return all.filter(p => p.status === 'pågående');
    },
    initialData: []
  });

  const activeTimeEntry = timeEntries.find(entry => entry.status === 'active');

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolokalisering stöds inte'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=sv`
            );
            const data = await response.json();
            
            resolve({
              latitude,
              longitude,
              address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            });
          } catch (error) {
            resolve({
              latitude,
              longitude,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            });
          }
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleClockAction = async () => {
    setLoading(true);
    try {
      if (activeTimeEntry) {
        // Clock out with location
        let location;
        try {
          location = await getLocation();
        } catch (locError) {
          console.warn('Could not get location:', locError);
          location = null;
        }

        const now = new Date();
        const clockInTime = new Date(activeTimeEntry.clock_in_time);
        const totalHours = (now - clockInTime) / (1000 * 60 * 60);
        const totalBreakMinutes = activeTimeEntry.total_break_minutes || 0;
        const netHours = totalHours - (totalBreakMinutes / 60);
        
        const updatedAllocations = activeTimeEntry.project_allocations?.map(alloc => ({
          ...alloc,
          hours: Number(netHours.toFixed(2))
        })) || [];

        const updateData = {
          clock_out_time: now.toISOString(),
          total_hours: Number(netHours.toFixed(2)),
          status: 'completed',
          project_allocations: updatedAllocations
        };

        if (location) {
          updateData.clock_out_location = location;
        }

        await base44.entities.TimeEntry.update(activeTimeEntry.id, updateData);
      } else {
        // Clock in - requires project and gets location
        if (!selectedProjectId) {
          alert(t('select_project_before'));
          setLoading(false);
          return;
        }

        let location;
        try {
          location = await getLocation();
        } catch (locError) {
          alert(t('location_required'));
          setLoading(false);
          return;
        }

        const entryData = {
          employee_email: user.email,
          date: new Date().toISOString().split('T')[0],
          clock_in_time: new Date().toISOString(),
          status: 'active',
          breaks: [],
          clock_in_location: location,
          project_allocations: [{
            project_id: selectedProjectId,
            hours: 0,
            category: 'interntid'
          }]
        };

        await base44.entities.TimeEntry.create(entryData);
      }
      await refetchTimeEntries();
    } catch (error) {
      console.error('Error:', error);
      alert('Kunde inte slutföra åtgärden: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('welcome_title')}</h1>
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
                {t('new_news')}
              </Button>
            )}
          </div>

          {/* Push Notification Prompt */}
          <PushPromptBanner user={user} />

          {/* Project Selector */}
          {!activeTimeEntry && (
            <ProjectSelector 
              selectedProjectId={selectedProjectId}
              onProjectSelect={setSelectedProjectId}
            />
          )}

          {/* Clock In / Out Section */}
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('select_project')}</h2>

          {/* Clock In/Out Card with Optimistic Updates */}
          <ClockInOutCard
            activeTimeEntry={activeTimeEntry}
            selectedProjectId={selectedProjectId}
            projects={projects}
            onClockAction={handleClockAction}
            loading={loading}
          />

        </motion.div>

        {/* Vehicle Trips Overview - Admin Only */}
        {user?.role === 'admin' && (
          <VehicleTripsOverview />
        )}

        {/* Important News Alert */}
        <ImportantNewsAlert 
          posts={importantPosts}
          onAcknowledge={handleAcknowledge}
          currentUserEmail={user?.email}
          onViewPost={setViewPost}
        />

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
                <p className="text-slate-500">{t('no_news')}</p>
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

      <ViewNewsModal
        open={!!viewPost}
        onClose={() => setViewPost(null)}
        post={viewPost}
        onReact={handleReact}
        onAcknowledge={handleAcknowledge}
        currentUserEmail={user?.email}
        onComment={setSelectedPost}
      />
      </div>
    </PullToRefresh>
  );
}