import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Send } from "lucide-react";
import ConversationList from '@/components/chat/ConversationList';
import MessageList from '@/components/chat/MessageList';
import { motion } from "framer-motion";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.Conversation.list('-updated_date', 50);
      return all.filter(conv => conv.participants.includes(user.email) && !conv.is_archived);
    },
    enabled: !!user?.email,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const all = await base44.entities.Message.list('-created_date', 100);
      return all
        .filter(msg => msg.conversation_id === selectedConversationId)
        .reverse();
    },
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      return base44.entities.Message.create({
        conversation_id: selectedConversationId,
        sender_email: user.email,
        sender_name: user.full_name,
        content,
        is_read: false,
        read_by: [user.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageContent('');
    },
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    await sendMessageMutation.mutate(messageContent);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 bg-white/95 backdrop-blur border-b p-4"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Meddelanden</h1>
            <Button size="icon" variant="outline" className="rounded-full">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        <div className="flex flex-1 gap-4 p-4 min-h-0">
          {/* Conversations List */}
          <div className="w-80 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              loading={conversationsLoading}
            />
          </div>

          {/* Messages View */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
            {selectedConversation ? (
              <>
                <div className="border-b p-4">
                  <h2 className="font-semibold text-slate-900">{selectedConversation.title}</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {messagesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <MessageList messages={messages} currentUserEmail={user?.email} />
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
                  <Input
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Skriv ett meddelande..."
                    className="flex-1 rounded-full h-11"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full h-11 w-11"
                    disabled={!messageContent.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>Välj en konversation för att börja chatta</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}