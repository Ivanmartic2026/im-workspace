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
import ContactList from '@/components/chat/ContactList';
import TypingIndicator from '@/components/chat/TypingIndicator';
import OnlineUsersList from '@/components/chat/OnlineUsersList';
import { motion, AnimatePresence } from "framer-motion";

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
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef(null);

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
  });

  // Subscribe to conversation updates
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = base44.entities.Conversation.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        if (event.data?.participants?.includes(user.email)) {
          refetchConversations();
        }
      }
    });

    return unsubscribe;
  }, [user?.email, refetchConversations]);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    
    // Initial load
    const loadMessages = async () => {
      try {
        const msgs = await base44.entities.Message.filter(
          { conversation_id: selectedConversationId },
          'created_date',
          100
        );
        setMessages(msgs);
        setMessagesLoading(false);
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessagesLoading(false);
      }
    };

    loadMessages();

    // Subscribe to real-time updates
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id !== selectedConversationId) return;

      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedConversationId]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!selectedConversationId || !messages.length || !user?.email) return;

    const unreadMessages = messages.filter(msg => 
      msg.sender_email !== user.email && 
      (!msg.read_by || !msg.read_by.some(r => r.email === user.email))
    );

    if (unreadMessages.length > 0) {
      base44.functions.invoke('markMessagesAsRead', {
        message_ids: unreadMessages.map(m => m.id)
      }).catch(err => console.error('Error marking as read:', err));
    }
  }, [messages, selectedConversationId, user?.email]);

  // Handle typing indicator
  const handleTypingChange = (value) => {
    setMessageContent(value);

    if (!selectedConversationId || !user?.email) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      base44.functions.invoke('updateTypingStatus', {
        conversation_id: selectedConversationId,
        is_typing: true
      }).catch(err => console.error('Typing error:', err));
    }

    // Clear typing status after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        base44.functions.invoke('updateTypingStatus', {
          conversation_id: selectedConversationId,
          is_typing: false
        }).catch(err => console.error('Typing error:', err));
      }
    }, 2000);
  };

  const createConversationMutation = useMutation({
    mutationFn: async (participants) => {
      const allParticipants = [...new Set([user.email, ...participants])];
      const conversation = await base44.entities.Conversation.create({
        title: conversationTitle || allParticipants.map(p => allUsers.find(u => u.email === p)?.full_name || p).join(', '),
        type: participants.length === 1 ? 'direct' : 'group',
        participants: allParticipants,
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

  const handleSelectContact = (selectedUser) => {
    // Check if conversation already exists
    const existingConv = conversations.find(conv => 
      conv.type === 'direct' && 
      conv.participants.includes(selectedUser.email) &&
      conv.participants.length === 2
    );

    if (existingConv) {
      setSelectedConversationId(existingConv.id);
      setShowNewConvModal(false);
    } else {
      createConversationMutation.mutate([selectedUser.email]);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      // Use backend function to handle message + notifications
      const response = await base44.functions.invoke('sendChatMessage', {
        conversation_id: selectedConversationId,
        content
      });
      return response.data;
    },
    onSuccess: () => {
      refetchConversations();
      setMessageContent('');
    },
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    
    // Clear typing status
    if (isTyping) {
      setIsTyping(false);
      base44.functions.invoke('updateTypingStatus', {
        conversation_id: selectedConversationId,
        is_typing: false
      }).catch(err => console.error('Typing error:', err));
    }
    
    await sendMessageMutation.mutate(messageContent);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const otherUsers = allUsers.filter(u => u.email !== user?.email);

  // Get typing users for selected conversation
  const typingUsers = selectedConversation?.typing_users
    ?.filter(tu => tu.email !== user?.email && 
      (new Date() - new Date(tu.timestamp)) < 5000) // Only show if typed within last 5 seconds
    ?.map(tu => tu.name) || [];

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
            <Button 
              onClick={() => { setShowNewConvModal(true); setChatType('direct'); }} 
              size="icon" 
              className="rounded-full bg-slate-900 hover:bg-slate-800 text-white h-11 w-11 shadow-lg"
            >
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
          <div className="w-80 overflow-y-auto space-y-4">
            <OnlineUsersList 
              currentUserEmail={user?.email}
              onStartChat={handleSelectContact}
            />
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              loading={conversationsLoading}
              currentUserEmail={user?.email}
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
                      <AnimatePresence>
                        {typingUsers.length > 0 && (
                          <TypingIndicator typingUsers={typingUsers} />
                        )}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
                  <Input
                    value={messageContent}
                    onChange={(e) => handleTypingChange(e.target.value)}
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
                  <AnimatePresence>
                    {typingUsers.length > 0 && (
                      <TypingIndicator typingUsers={typingUsers} />
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
              <Input
                value={messageContent}
                onChange={(e) => handleTypingChange(e.target.value)}
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
              <div className="flex items-center justify-between pr-14">
                <h1 className="text-2xl font-bold text-slate-900">Meddelanden</h1>
                <Button 
                  onClick={() => { setShowNewConvModal(true); setChatType('direct'); }} 
                  size="icon" 
                  className="rounded-full bg-slate-900 hover:bg-slate-800 text-white h-11 w-11 shadow-lg"
                >
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

            <div className="flex-1 overflow-y-auto space-y-4 px-4">
              <OnlineUsersList 
                currentUserEmail={user?.email}
                onStartChat={handleSelectContact}
              />
              <ConversationList
                conversations={filteredConversations}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
                loading={conversationsLoading}
                currentUserEmail={user?.email}
              />
            </div>
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      <Dialog open={showNewConvModal} onOpenChange={setShowNewConvModal}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Ny konversation</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Chat Type Selector */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => { setChatType('direct'); setConversationTitle(''); setSelectedParticipants([]); }}
                  className={`py-2.5 px-4 rounded-md font-medium text-sm transition-all ${
                    chatType === 'direct' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600'
                  }`}
                >
                  Privat chat
                </button>
                <button
                  onClick={() => { setChatType('group'); setSelectedParticipants([]); }}
                  className={`py-2.5 px-4 rounded-md font-medium text-sm transition-all ${
                    chatType === 'group' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600'
                  }`}
                >
                  Gruppchatt
                </button>
              </div>
            </div>

            {chatType === 'direct' ? (
              <div className="flex-1 overflow-hidden">
                <ContactList 
                  users={allUsers}
                  currentUserEmail={user?.email}
                  onSelectUser={handleSelectContact}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col px-6">
                <Input
                  placeholder="Gruppnamn (valfritt)"
                  value={conversationTitle}
                  onChange={(e) => setConversationTitle(e.target.value)}
                  className="rounded-xl h-11 mb-4"
                />

                <div className="flex-1 overflow-y-auto space-y-1">
                  <p className="text-xs font-medium text-slate-500 mb-3">
                    Valda: {selectedParticipants.length}
                  </p>
                  {otherUsers.map(u => {
                    const isSelected = selectedParticipants.includes(u.email);
                    return (
                      <button
                        key={u.email}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedParticipants(selectedParticipants.filter(e => e !== u.email));
                          } else {
                            setSelectedParticipants([...selectedParticipants, u.email]);
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isSelected 
                            ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' 
                            : 'bg-white hover:bg-slate-50 border border-slate-100'
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                          isSelected 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.full_name?.charAt(0) || u.email?.charAt(0)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-slate-900 text-sm">{u.full_name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 pb-6">
                  <Button
                    onClick={() => createConversationMutation.mutate(selectedParticipants)}
                    disabled={selectedParticipants.length < 2 || createConversationMutation.isPending}
                    className="w-full h-12 rounded-xl font-medium text-base"
                    size="lg"
                  >
                    {createConversationMutation.isPending ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Skapar...
                      </>
                    ) : (
                      'Skapa gruppchatt'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}