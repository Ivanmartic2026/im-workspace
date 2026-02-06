import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import OnlineIndicator from './OnlineIndicator';

export default function ConversationList({ conversations, selectedId, onSelect, loading, currentUserEmail }) {
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['activeTimeEntries'],
    queryFn: async () => {
      const all = await base44.entities.TimeEntry.list('-updated_date', 100);
      return all.filter(e => e.status === 'active');
    },
    refetchInterval: 5000,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['allMessages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    refetchInterval: 3000,
  });

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOtherParticipantEmail = (conv) => {
    if (conv.type === 'direct') {
      return conv.participants.find(p => p !== currentUserEmail);
    }
    return null;
  };

  const isParticipantClockedIn = (email) => {
    return timeEntries.some(e => e.employee_email === email);
  };

  const getUnreadCount = (convId) => {
    if (!currentUserEmail) return 0;
    return allMessages.filter(msg => 
      msg.conversation_id === convId && 
      msg.sender_email !== currentUserEmail &&
      (!msg.read_by || !msg.read_by.some(r => r.email === currentUserEmail))
    ).length;
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
      {conversations.map((conv) => {
        const otherParticipant = getOtherParticipantEmail(conv);
        const isClockedIn = otherParticipant && isParticipantClockedIn(otherParticipant);
        const unreadCount = getUnreadCount(conv.id);

        return (
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
                <div className="relative">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-slate-200 text-slate-600">
                      {getInitials(conv.title)}
                    </AvatarFallback>
                  </Avatar>
                  {conv.type === 'direct' && otherParticipant && (
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <OnlineIndicator isClockedIn={isClockedIn} size="xs" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-slate-900 truncate">{conv.title}</h3>
                    {unreadCount > 0 && (
                      <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
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
        );
      })}
    </div>
  );
}