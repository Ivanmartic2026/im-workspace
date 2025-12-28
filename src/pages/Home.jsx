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
import ClockInOutCard from "@/components/time/ClockInOutCard";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('alla');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['newsPosts'],
    queryFn: () => base44.entities.NewsPost.list('-created_date', 50),
  });

  const { data: timeEntries = [], refetch: refetchTimeEntries } = useQuery({
    queryKey: ['timeEntries', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const entries = await base44.entities.TimeEntry.filter({ employee_email: user.email }, '-created_date', 10);
      return entries;
    },
    enabled: !!user?.email
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
              <h1 className="text-2xl font-bold text-slate-900">Nyheter</h1>
              <p className="text-sm text-slate-500 mt-1">
                {user ? `Välkommen, ${user.full_name?.split(' ')[0]}` : 'Välkommen'}
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

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök nyheter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-0 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-slate-200"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-2xl grid grid-cols-5">
              <TabsTrigger value="alla" className="rounded-xl data-[state=active]:shadow-sm">Alla</TabsTrigger>
              <TabsTrigger value="ledning" className="rounded-xl data-[state=active]:shadow-sm">Ledning</TabsTrigger>
              <TabsTrigger value="hr" className="rounded-xl data-[state=active]:shadow-sm">HR</TabsTrigger>
              <TabsTrigger value="event" className="rounded-xl data-[state=active]:shadow-sm">Event</TabsTrigger>
              <TabsTrigger value="allmänt" className="rounded-xl data-[state=active]:shadow-sm">Allmänt</TabsTrigger>
            </TabsList>
          </Tabs>
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
    </div>
  );
}