import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function MessageList({ messages, currentUserEmail }) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">Ingen meddelanden än</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <AnimatePresence mode="popLayout">
        {messages.map((msg, idx) => {
          const isOwn = msg.sender_email === currentUserEmail;
          const isPending = msg.id?.startsWith('temp-');
          return (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {!isOwn && (
                <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                  <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-xs font-semibold">
                    {getInitials(msg.sender_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`flex-1 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isOwn && (
                  <p className="text-xs font-semibold text-slate-700 mb-1 px-1">{msg.sender_name}</p>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                    isOwn
                      ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'
                      : 'bg-white text-slate-900 border border-slate-200'
                  } ${isPending ? 'opacity-60' : ''}`}
                >
                  <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                </div>
                <p className={`text-xs mt-1 px-1 ${isOwn ? 'text-right' : ''} text-slate-400`}>
                  {format(new Date(msg.created_date), 'HH:mm', { locale: sv })}
                  {isPending && ' • Skickar...'}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}