import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function ConversationList({ conversations, selectedId, onSelect, loading }) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">Inga konversationer än</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <motion.div
          key={conv.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card
            onClick={() => onSelect(conv.id)}
            className={`p-3 cursor-pointer transition-all ${
              selectedId === conv.id
                ? 'bg-slate-100 border-slate-300'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-slate-200 text-slate-600">
                  {getInitials(conv.title)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900 truncate">{conv.title}</h3>
                <p className="text-xs text-slate-500 truncate">{conv.last_message || 'Ingen meddelanden'}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {conv.last_message_at
                    ? format(new Date(conv.last_message_at), 'd MMM HH:mm', { locale: sv })
                    : ''}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}