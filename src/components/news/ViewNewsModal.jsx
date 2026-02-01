import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { ThumbsUp, Heart, PartyPopper, MessageCircle, CheckCircle } from "lucide-react";

const categoryColors = {
  ledning: 'bg-purple-100 text-purple-700',
  hr: 'bg-blue-100 text-blue-700',
  event: 'bg-pink-100 text-pink-700',
  allmänt: 'bg-slate-100 text-slate-700'
};

const categoryLabels = {
  ledning: 'Ledning',
  hr: 'HR',
  event: 'Event',
  allmänt: 'Allmänt'
};

const reactionIcons = {
  likes: ThumbsUp,
  hearts: Heart,
  celebrates: PartyPopper
};

export default function ViewNewsModal({ open, onClose, post, onReact, onAcknowledge, currentUserEmail, onComment }) {
  if (!post) return null;

  const hasAcknowledged = post.acknowledged_by?.some(ack => ack.email === currentUserEmail);
  const requiresAck = post.requires_acknowledgment;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-3">
            {post.is_important && (
              <Badge className="bg-amber-100 text-amber-700 w-fit">
                ⚠️ Viktigt meddelande
              </Badge>
            )}
            <DialogTitle className="text-2xl font-bold leading-tight">
              {post.title}
            </DialogTitle>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Badge className={categoryColors[post.category] || categoryColors.allmänt}>
                {categoryLabels[post.category] || 'Allmänt'}
              </Badge>
              <span>•</span>
              <span>{format(new Date(post.created_date), 'd MMMM yyyy', { locale: sv })}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {post.image_url && (
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full rounded-lg object-cover max-h-96"
            />
          )}

          <div className="prose prose-sm max-w-none">
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* Reactions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            {Object.entries(reactionIcons).map(([type, Icon]) => {
              const count = post.reactions?.[type]?.length || 0;
              const hasReacted = post.reactions?.[type]?.includes(currentUserEmail);
              return (
                <button
                  key={type}
                  onClick={() => onReact(post.id, type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    hasReacted
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {count > 0 && <span className="text-sm font-medium">{count}</span>}
                </button>
              );
            })}
            <button
              onClick={() => onComment(post)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all ml-auto"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {post.comments?.length || 0}
              </span>
            </button>
          </div>

          {/* Acknowledgment */}
          {requiresAck && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              {hasAcknowledged ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Du har bekräftat att du läst detta</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-amber-800 font-medium">
                    Detta meddelande kräver att du bekräftar att du läst och förstått innehållet.
                  </p>
                  <Button
                    onClick={() => {
                      onAcknowledge(post.id);
                      onClose();
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    Bekräfta att jag läst detta
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Comments preview */}
          {post.comments?.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium text-slate-700">
                Senaste kommentarer ({post.comments.length})
              </p>
              {post.comments.slice(-3).map((comment, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-900">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(comment.created_at), 'd MMM HH:mm', { locale: sv })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{comment.content}</p>
                </div>
              ))}
              {post.comments.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onComment(post)}
                  className="w-full"
                >
                  Visa alla kommentarer
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}