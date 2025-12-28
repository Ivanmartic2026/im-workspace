import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function CommentsModal({ open, onClose, post, onAddComment, currentUser }) {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  if (!post) return null;

  const comments = post.comments || [];

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setSending(true);
    await onAddComment(post.id, comment);
    setComment('');
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold pr-8 line-clamp-2">{post.title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-[200px] py-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>Inga kommentarer ännu</p>
                <p className="text-sm mt-1">Bli först att kommentera!</p>
              </div>
            ) : (
              comments.map((c, idx) => (
                <motion.div
                  key={c.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-3"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                      {getInitials(c.author_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-2.5">
                      <p className="text-xs font-medium text-slate-700">{c.author_name}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{c.content}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 ml-2">
                      {format(new Date(c.created_at), "d MMM 'kl' HH:mm", { locale: sv })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Skriv en kommentar..."
            className="flex-1 h-11 rounded-full px-4"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-11 w-11 rounded-full"
            disabled={!comment.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}