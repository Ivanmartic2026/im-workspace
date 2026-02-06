import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, ThumbsUp, PartyPopper, MessageCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

const categoryColors = {
  ledning: "bg-indigo-100 text-indigo-700 border-indigo-200",
  hr: "bg-emerald-100 text-emerald-700 border-emerald-200",
  event: "bg-amber-100 text-amber-700 border-amber-200",
  allmänt: "bg-slate-100 text-slate-700 border-slate-200"
};

const categoryLabels = {
  ledning: "Ledning",
  hr: "HR",
  event: "Event",
  allmänt: "Allmänt"
};

export default function NewsFeedCard({ post, onReact, onComment, onAcknowledge, currentUserEmail }) {
  const reactions = post.reactions || { likes: [], hearts: [], celebrates: [] };
  const comments = post.comments || [];
  
  const hasLiked = reactions.likes?.includes(currentUserEmail);
  const hasHearted = reactions.hearts?.includes(currentUserEmail);
  const hasCelebrated = reactions.celebrates?.includes(currentUserEmail);
  
  const hasAcknowledged = post.acknowledged_by?.some(ack => ack.email === currentUserEmail);
  const needsAcknowledgment = post.requires_acknowledgment && !hasAcknowledged;

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={`overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 ${
        needsAcknowledgment ? 'ring-2 ring-blue-400' : 
        post.is_important ? 'ring-2 ring-amber-400 bg-amber-50/30' : 'bg-white'
      }`}>
        {needsAcknowledgment && (
          <div className="bg-blue-50 border-b-2 border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Bekräftelse krävs</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Denna nyhet kräver att du bekräftar att du har läst innehållet.
                </p>
                <Button 
                  onClick={() => onAcknowledge(post.id)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Jag har läst och förstått
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={needsAcknowledgment ? 'blur-sm pointer-events-none select-none' : ''}>
          {post.image_url && (
            <motion.div 
              className="h-48 overflow-hidden"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <img 
                src={post.image_url} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          )}
          
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary" className={`${categoryColors[post.category]} border text-xs font-medium`}>
                    {categoryLabels[post.category]}
                  </Badge>
                  {post.is_important && (
                    <Badge className="bg-amber-500 text-white border-0 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Viktigt
                    </Badge>
                  )}
                  {post.requires_acknowledgment && (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Kräver bekräftelse
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-lg text-slate-900 leading-tight">{post.title}</h3>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <span>{format(new Date(post.created_date), "d MMM yyyy 'kl' HH:mm", { locale: sv })}</span>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
            
            <motion.div 
              className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-1">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReact(post.id, 'likes')}
                    className={`h-9 px-3 rounded-full transition-all ${hasLiked ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <motion.div
                      animate={hasLiked ? { rotate: [0, -15, 15, -15, 0] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      <ThumbsUp className={`w-4 h-4 mr-1.5 ${hasLiked ? 'fill-current' : ''}`} />
                    </motion.div>
                    <span className="text-xs font-medium">{reactions.likes?.length || 0}</span>
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReact(post.id, 'hearts')}
                    className={`h-9 px-3 rounded-full transition-all ${hasHearted ? 'bg-rose-100 text-rose-500' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <motion.div
                      animate={hasHearted ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <Heart className={`w-4 h-4 mr-1.5 ${hasHearted ? 'fill-current' : ''}`} />
                    </motion.div>
                    <span className="text-xs font-medium">{reactions.hearts?.length || 0}</span>
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReact(post.id, 'celebrates')}
                    className={`h-9 px-3 rounded-full transition-all ${hasCelebrated ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <motion.div
                      animate={hasCelebrated ? { rotate: [0, -20, 20, -20, 0], scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.6 }}
                    >
                      <PartyPopper className={`w-4 h-4 mr-1.5 ${hasCelebrated ? 'fill-current' : ''}`} />
                    </motion.div>
                    <span className="text-xs font-medium">{reactions.celebrates?.length || 0}</span>
                  </Button>
                </motion.div>
              </div>

              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onComment(post)}
                  className="h-9 px-3 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  <span className="text-xs font-medium">{comments.length}</span>
                </Button>
              </motion.div>
            </motion.div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}