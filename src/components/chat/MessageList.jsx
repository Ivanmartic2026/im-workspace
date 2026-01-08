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
    <div className="space-y-3 py-4">
      <AnimatePresence mode="popLayout">
        {messages.map((msg, idx) => {
          const isOwn = msg.sender_email === currentUserEmail;
          return (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {!isOwn && (
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                    {getInitials(msg.sender_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`flex-1 max-w-xs ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isOwn && (
                  <p className="text-xs font-medium text-slate-600 mb-1">{msg.sender_name}</p>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
                <p className={`text-xs mt-1 ${isOwn ? 'text-right' : ''} text-slate-400`}>
                  {format(new Date(msg.created_date), 'HH:mm', { locale: sv })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}