import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import OnlineIndicator from './OnlineIndicator';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnlineUsersList({ currentUserEmail, onStartChat }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    refetchInterval: 5000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['activeTimeEntries'],
    queryFn: async () => {
      const all = await base44.entities.TimeEntry.list('-updated_date', 100);
      return all.filter(e => e.status === 'active');
    },
    refetchInterval: 5000,
  });

  // Merge user data with employee data and check if clocked in
  const enrichedUsers = users
    .filter(u => u.email !== currentUserEmail)
    .map(user => {
      const employee = employees.find(e => e.user_email === user.email);
      const clockedInEntry = timeEntries.find(e => e.employee_email === user.email);
      
      return {
        ...user,
        employee,
        isClockedIn: !!clockedInEntry,
        lastSeen: clockedInEntry?.updated_date || employee?.updated_date || user.updated_date
      };
    })
    .sort((a, b) => {
      // Sort: clocked in first, then by last seen
      if (a.isClockedIn && !b.isClockedIn) return -1;
      if (!a.isClockedIn && b.isClockedIn) return 1;
      return new Date(b.lastSeen) - new Date(a.lastSeen);
    });

  const clockedInUsers = enrichedUsers.filter(u => u.isClockedIn);
  const onlineUsers = enrichedUsers.filter(u => !u.isClockedIn && isRecentlyActive(u.lastSeen));
  const offlineUsers = enrichedUsers.filter(u => !u.isClockedIn && !isRecentlyActive(u.lastSeen));

  function isRecentlyActive(lastSeen) {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  }

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderUserCard = (user) => (
    <motion.div
      key={user.email}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-slate-50 transition-all border border-slate-100 hover:border-slate-200"
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator 
            isClockedIn={user.isClockedIn}
            isOnline={isRecentlyActive(user.lastSeen)}
          />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate text-sm">
          {user.full_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {user.isClockedIn ? (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Incheckad
            </span>
          ) : isRecentlyActive(user.lastSeen) ? (
            <span className="text-xs text-blue-600 font-medium">
              Online
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Offline
            </span>
          )}
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => onStartChat(user)}
        className="h-8 w-8 rounded-full hover:bg-blue-100 hover:text-blue-600"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </motion.div>
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader 
        className="cursor-pointer pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>Kollegor</span>
            {clockedInUsers.length > 0 && (
              <span className="text-xs font-normal text-emerald-600">
                {clockedInUsers.length} incheckade
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-3 pb-4">
              {clockedInUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
                    Incheckade ({clockedInUsers.length})
                  </p>
                  {clockedInUsers.map(renderUserCard)}
                </div>
              )}

              {onlineUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
                    Online ({onlineUsers.length})
                  </p>
                  {onlineUsers.map(renderUserCard)}
                </div>
              )}

              {offlineUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
                    Offline ({offlineUsers.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {offlineUsers.map(renderUserCard)}
                  </div>
                </div>
              )}

              {enrichedUsers.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Inga kollegor hittades
                </p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}