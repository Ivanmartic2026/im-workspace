import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function ImportantNewsAlert({ posts, onAcknowledge, currentUserEmail, onViewPost }) {
  const [dismissedPosts, setDismissedPosts] = useState([]);

  // Load dismissed posts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dismissedImportantNews');
    if (stored) {
      setDismissedPosts(JSON.parse(stored));
    }
  }, []);

  const handleDismiss = (postId) => {
    const newDismissed = [...dismissedPosts, postId];
    setDismissedPosts(newDismissed);
    localStorage.setItem('dismissedImportantNews', JSON.stringify(newDismissed));
  };

  // Filter out dismissed posts and posts user has acknowledged
  const visiblePosts = posts.filter(post => {
    const isDismissed = dismissedPosts.includes(post.id);
    const hasAcknowledged = post.acknowledged_by?.some(ack => ack.email === currentUserEmail);
    const requiresAck = post.requires_acknowledgment;
    
    // Show if not dismissed AND (doesn't require ack OR not acknowledged)
    return !isDismissed && (!requiresAck || !hasAcknowledged);
  });

  if (visiblePosts.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <AnimatePresence mode="popLayout">
        {visiblePosts.map((post, index) => {
          const hasAcknowledged = post.acknowledged_by?.some(ack => ack.email === currentUserEmail);
          const requiresAck = post.requires_acknowledgment;
          const isNew = new Date() - new Date(post.created_date) < 24 * 60 * 60 * 1000; // Less than 24h

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Bell className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 text-sm">
                            {post.title}
                          </h3>
                          {isNew && (
                            <Badge className="bg-red-500 text-white text-xs">NYT</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{format(new Date(post.created_date), 'd MMM', { locale: sv })}</span>
                          {requiresAck && !hasAcknowledged && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 font-medium">Kräver bekräftelse</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-slate-200"
                      onClick={() => handleDismiss(post.id)}
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs bg-white"
                      onClick={() => onViewPost(post)}
                    >
                      Läs mer
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                    {requiresAck && !hasAcknowledged && (
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-amber-600 hover:bg-amber-700"
                        onClick={() => {
                          onAcknowledge(post.id);
                          handleDismiss(post.id);
                        }}
                      >
                        Bekräfta
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}