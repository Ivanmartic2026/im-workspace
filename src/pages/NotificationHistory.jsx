import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Trash2, CheckCircle2, Search, Clock, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";

export default function NotificationHistory() {
  const [user, setUser] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => user ? base44.entities.Notification.filter({
      recipient_email: user.email
    }, '-created_date', 200) : [],
    enabled: !!user
  });

  const markAsReadMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Notification.update(id, {
      is_read: true,
      read_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      for (const notif of unreadNotifications) {
        await base44.entities.Notification.update(notif.id, {
          is_read: true,
          read_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      if (!window.confirm('Är du säker på att du vill radera all notifikationshistorik?')) {
        return;
      }
      for (const notif of notifications) {
        await base44.entities.Notification.delete(notif.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Filter and sort
  const filtered = notifications
    .filter(notif => {
      if (filterType !== 'all' && notif.type !== filterType) return false;
      if (filterRead === 'unread' && notif.is_read) return false;
      if (filterRead === 'read' && !notif.is_read) return false;
      if (searchQuery && !notif.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !notif.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aDate = new Date(a.created_date);
      const bDate = new Date(b.created_date);
      return sortOrder === 'newest' ? bDate - aDate : aDate - bDate;
    });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700',
    normal: 'bg-slate-100 text-slate-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700'
  };

  const typeIcons = {
    forgot_clock_out: Clock,
    approval_needed: CheckCircle2,
    approved: CheckCircle2,
    rejected: AlertCircle,
    time_correction_needed: AlertCircle,
    overtime_warning: AlertCircle,
    vacation_reminder: Info,
    policy_violation: AlertCircle,
    system: Info
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-slate-900">Notifikationer</h1>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount} oläst</Badge>
              )}
            </div>
            <p className="text-slate-600">
              {notifications.length === 0 
                ? 'Du har ingen notifikationshistorik ännu'
                : `${filtered.length} av ${notifications.length} notifikationer`}
            </p>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="flex gap-2 mb-4">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  Markera allt som läst
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Radera allt
              </Button>
            </div>
          )}

          {/* Filters */}
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Sök notifikationer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla typer</SelectItem>
                      <SelectItem value="approval_needed">Godkännande</SelectItem>
                      <SelectItem value="overtime_warning">Övertid</SelectItem>
                      <SelectItem value="vacation_reminder">Semester</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterRead} onValueChange={setFilterRead}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla</SelectItem>
                      <SelectItem value="unread">Oläst</SelectItem>
                      <SelectItem value="read">Läst</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Nyast först</SelectItem>
                      <SelectItem value="oldest">Äldst först</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          {isLoading ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-pulse" />
              <p className="text-slate-500">Laddar notifikationer...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Inga notifikationer</h3>
                <p className="text-slate-500">
                  {searchQuery || filterType !== 'all' 
                    ? 'Ingen notifikation matchar dina filter'
                    : 'Du har ingen notifikationshistorik ännu'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((notif, idx) => {
                const IconComponent = typeIcons[notif.type] || Info;
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className={`border-0 shadow-sm ${!notif.is_read ? 'bg-blue-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            notif.is_read ? 'bg-slate-100' : 'bg-blue-100'
                          }`}>
                            <IconComponent className={`h-5 w-5 ${
                              notif.is_read ? 'text-slate-600' : 'text-blue-600'
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className={`font-semibold text-sm ${
                                notif.is_read ? 'text-slate-900' : 'text-blue-900'
                              }`}>
                                {notif.title}
                              </h3>
                              {!notif.is_read && (
                                <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                              )}
                            </div>

                            <p className="text-sm text-slate-600 mb-2">
                              {notif.message}
                            </p>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {format(new Date(notif.created_date), 'PPp', { locale: sv })}
                                </Badge>
                                <Badge className={`text-xs ${priorityColors[notif.priority] || priorityColors.normal}`}>
                                  {notif.priority}
                                </Badge>
                              </div>

                              <div className="flex gap-1">
                                {!notif.is_read && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => markAsReadMutation.mutate({ id: notif.id })}
                                    disabled={markAsReadMutation.isPending}
                                    className="h-8"
                                  >
                                    Markera läst
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteNotificationMutation.mutate({ id: notif.id })}
                                  disabled={deleteNotificationMutation.isPending}
                                  className="h-8"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}