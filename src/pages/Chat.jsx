import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Send, Users, X, ChevronLeft, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import ConversationList from '@/components/chat/ConversationList';
import MessageList from '@/components/chat/MessageList';
import { motion } from "framer-motion";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [conversationTitle, setConversationTitle] = useState('');
  const [chatType, setChatType] = useState('direct'); // 'direct' or 'group'
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.Conversation.list('-updated_date', 50);
      return all.filter(conv => conv.participants.includes(user.email) && !conv.is_archived);
    },
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    const unsubscribe = base44.agents.subscribeToConversation(selectedConversationId, (data) => {
      setMessages(data.messages.reverse());
      setMessagesLoading(false);
    });

    return () => {
      unsubscribe();
      setMessagesLoading(false);
    };
  }, [selectedConversationId]);

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const participants = [...new Set([user.email, ...selectedParticipants])];
      const conversation = await base44.entities.Conversation.create({
        title: conversationTitle || participants.map(p => allUsers.find(u => u.email === p)?.full_name || p).join(', '),
        type: selectedParticipants.length === 1 ? 'direct' : 'group',
        participants,
        is_archived: false
      });
      return conversation;
    },
    onSuccess: (conversation) => {
      refetchConversations();
      setSelectedConversationId(conversation.id);
      setShowNewConvModal(false);
      setConversationTitle('');
      setSelectedParticipants([]);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const message = await base44.entities.Message.create({
        conversation_id: selectedConversationId,
        sender_email: user.email,
        sender_name: user.full_name,
        content,
        is_read: false,
        read_by: [user.email]
      });

      // Update conversation
      await base44.entities.Conversation.update(selectedConversationId, {
        last_message: content,
        last_message_at: new Date().toISOString(),
        last_message_by: user.email
      });

      // Get conversation to find participants
      const convs = await base44.entities.Conversation.filter({ id: selectedConversationId }, null, 1);
      if (convs.length > 0) {
        const participants = convs[0].participants || [];
        for (const participantEmail of participants) {
          if (participantEmail !== user.email) {
            await base44.entities.Notification.create({
              recipient_email: participantEmail,
              type: 'chat',
              title: 'Nytt chattmeddelande',
              message: `${user.full_name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
              priority: 'normal',
              is_read: false,
              related_entity_id: message.id,
              related_entity_type: 'Message',
              sent_via: ['app', 'push']
            });
          }
        }
      }

      return message;
    },
    onSuccess: () => {
      refetchConversations();
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

  const otherUsers = allUsers.filter(u => u.email !== user?.email);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter messages based on search
  const filteredMessages = messages.filter(msg => {
    if (!messageSearchQuery.trim()) return true;
    return msg.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Desktop Layout */}
      <div className="hidden md:flex max-w-6xl mx-auto h-screen flex-col">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 bg-white/95 backdrop-blur border-b p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Meddelanden</h1>
            <Button onClick={() => { setShowNewConvModal(true); setChatType('direct'); }} size="icon" variant="outline" className="rounded-full">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Sök konversationer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-lg h-10"
            />
          </div>
        </motion.div>

        <div className="flex flex-1 gap-4 p-4 min-h-0">
          <div className="w-80 overflow-y-auto">
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              loading={conversationsLoading}
            />
          </div>

          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
            {selectedConversation ? (
              <>
                <div className="border-b p-4">
                  <h2 className="font-semibold text-slate-900">{selectedConversation.title}</h2>
                </div>

                <div className="border-b p-3 flex items-center gap-2">
                  {messages.length > 0 && (
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Sök i chathistorik..."
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        className="pl-10 h-9 text-sm"
                      />
                    </div>
                  )}
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
                      <MessageList messages={filteredMessages} currentUserEmail={user?.email} />
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

      {/* Mobile Layout */}
      <div className="md:hidden max-w-2xl mx-auto h-screen flex flex-col">
        {selectedConversationId ? (
          <>
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b p-4 flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedConversationId(null)}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="font-semibold text-slate-900 flex-1">{selectedConversation?.title}</h2>
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
          <>
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Meddelanden</h1>
                <Button onClick={() => { setShowNewConvModal(true); setChatType('direct'); }} size="icon" variant="outline" className="rounded-full">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Sök konversationer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg h-10 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={filteredConversations}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
                loading={conversationsLoading}
              />
            </div>
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      <Dialog open={showNewConvModal} onOpenChange={setShowNewConvModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ny konversation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Chat Type Selector */}
            <div className="flex gap-2">
              <Button
                variant={chatType === 'direct' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setChatType('direct'); setConversationTitle(''); }}
                className="flex-1"
              >
                Privat
              </Button>
              <Button
                variant={chatType === 'group' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChatType('group')}
                className="flex-1"
              >
                Grupp
              </Button>
            </div>

            {/* Conversation Title - Only for Groups */}
            {chatType === 'group' && (
              <Input
                placeholder="Gruppnamn (t.ex. 'Projekt Alpha')"
                value={conversationTitle}
                onChange={(e) => setConversationTitle(e.target.value)}
                className="rounded-lg"
              />
            )}

            {/* User Selection */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chatType === 'direct' && (
                <p className="text-xs text-slate-500 px-3 pt-2">Välj en person för privat chat</p>
              )}
              {chatType === 'group' && (
                <p className="text-xs text-slate-500 px-3 pt-2">Välj gruppmedlemmar (minst 2)</p>
              )}
              {otherUsers.map(u => (
                <label 
                  key={u.email} 
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer ${chatType === 'direct' && selectedParticipants.includes(u.email) ? 'bg-blue-50' : ''}`}
                >
                  <Checkbox
                    checked={selectedParticipants.includes(u.email)}
                    onCheckedChange={(checked) => {
                      if (chatType === 'direct') {
                        // For direct chats, only allow one selection
                        setSelectedParticipants(checked ? [u.email] : []);
                      } else {
                        // For group chats, allow multiple selections
                        if (checked) {
                          setSelectedParticipants([...selectedParticipants, u.email]);
                        } else {
                          setSelectedParticipants(selectedParticipants.filter(e => e !== u.email));
                        }
                      }
                    }}
                  />
                  <span className="text-sm font-medium">{u.full_name}</span>
                </label>
              ))}
            </div>

            <Button
              onClick={() => createConversationMutation.mutate()}
              disabled={selectedParticipants.length === 0 || (chatType === 'group' && selectedParticipants.length < 2) || createConversationMutation.isPending}
              className="w-full"
            >
              {createConversationMutation.isPending ? 'Skapar...' : `Skapa ${chatType === 'direct' ? 'privat chat' : 'grupp'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}