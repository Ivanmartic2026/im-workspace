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
import { Card, CardContent } from "@/components/ui/card";
import { Clock as ClockIcon, MapPin, Briefcase, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewPost, setViewPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('alla');
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return localStorage.getItem('lastSelectedProjectId') || null;
  });
  const [loading, setLoading] = useState(false);
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

          {/* Active Clock-In Info */}
          {activeTimeEntry && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Card className="border-0 shadow-sm bg-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-semibold text-emerald-900">Instämplad</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-800">
                      <ClockIcon className="w-4 h-4" />
                      <span className="font-medium">{format(new Date(activeTimeEntry.clock_in_time), 'HH:mm')}</span>
                    </div>
                    
                    {activeTimeEntry.project_allocations && activeTimeEntry.project_allocations.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-emerald-800">
                        <Briefcase className="w-4 h-4" />
                        <span className="font-medium">
                          {projects.find(p => p.id === activeTimeEntry.project_allocations[0]?.project_id)?.name || 'Projekt'}
                        </span>
                      </div>
                    )}
                    
                    {activeTimeEntry.clock_in_location && (
                      <div className="flex items-start gap-2 text-sm text-emerald-800">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2 font-medium">{activeTimeEntry.clock_in_location.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Project Selector */}
          {!activeTimeEntry && (
            <ProjectSelector 
              selectedProjectId={selectedProjectId}
              onProjectSelect={setSelectedProjectId}
            />
          )}

          {/* Clock In Button */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-0">
              <Button
                onClick={async () => {
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
                        alert('Du måste välja ett projekt innan du stämplar in');
                        setLoading(false);
                        return;
                      }

                      let location;
                      try {
                        location = await getLocation();
                      } catch (locError) {
                        console.warn('Could not get location:', locError);
                        location = null;
                      }

                      const entryData = {
                        employee_email: user.email,
                        date: new Date().toISOString().split('T')[0],
                        clock_in_time: new Date().toISOString(),
                        status: 'active',
                        breaks: [],
                        project_allocations: [{
                          project_id: selectedProjectId,
                          hours: 0,
                          category: 'interntid'
                        }]
                      };

                      if (location) {
                        entryData.clock_in_location = location;
                      }

                      await base44.entities.TimeEntry.create(entryData);
                    }
                    await refetchTimeEntries();
                  } catch (error) {
                    console.error('Error:', error);
                    alert('Kunde inte slutföra åtgärden: ' + error.message);
                  }
                  setLoading(false);
                }}
                disabled={(!activeTimeEntry && !selectedProjectId) || loading}
                className={`w-full h-16 text-lg font-semibold transition-all rounded-2xl ${
                  activeTimeEntry 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : selectedProjectId
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {activeTimeEntry ? 'Stämplar ut...' : 'Stämplar in...'}
                  </>
                ) : (
                  <>
                    <ClockIcon className="h-5 w-5 mr-2" />
                    {activeTimeEntry ? 'Stämpla ut' : 'Stämpla in'}
                  </>
                )}
              </Button>
              {!activeTimeEntry && !selectedProjectId && (
                <p className="text-xs text-center text-rose-600 py-2 font-medium">
                  ⚠️ Välj ett projekt först
                </p>
              )}
            </CardContent>
          </Card>

        </motion.div>

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
  );
}