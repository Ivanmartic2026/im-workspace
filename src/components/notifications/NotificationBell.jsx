import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import NotificationsList from './NotificationsList';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];

      const notifs = [];

      // Hämta systemnotifikationer (både lästa och olästa)
      const systemNotifications = await base44.entities.Notification.filter(
        { recipient_email: user.email }, 
        '-created_date', 
        100
      );
      systemNotifications.forEach(notif => {
        notifs.push({
          id: `notification-${notif.id}`,
          type: notif.type === 'system' ? 'system' : notif.type,
          title: notif.title,
          description: notif.message,
          date: notif.created_date,
          urgent: notif.priority === 'urgent' || notif.priority === 'high',
          data: notif
        });
      });

      // Nya viktiga nyheter (senaste 7 dagarna)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const news = await base44.entities.NewsPost.filter({ is_important: true }, '-created_date', 10);
      news.forEach(post => {
        if (new Date(post.created_date) > sevenDaysAgo) {
          notifs.push({
            id: `news-${post.id}`,
            type: 'news',
            title: 'Viktigt meddelande',
            description: post.title,
            date: post.created_date,
            urgent: true,
            data: post
          });
        }
      });

      // Väntande ledighetsansökningar (för admin/chef)
      if (user.role === 'admin') {
        const pendingLeave = await base44.entities.LeaveRequest.filter({ status: 'pending' }, '-created_date', 20);
        pendingLeave.forEach(request => {
          notifs.push({
            id: `leave-${request.id}`,
            type: 'leave',
            title: 'Ledighetsansökan',
            description: `${request.employee_email} väntar på godkännande`,
            date: request.created_date,
            urgent: false,
            data: request
          });
        });
      }

      // Nya chattmeddelanden
      const chatNotifications = await base44.entities.Notification.filter(
        { recipient_email: user.email, type: 'chat', is_read: false },
        '-created_date',
        20
      );
      chatNotifications.forEach(notif => {
        notifs.push({
          id: `chat-${notif.id}`,
          type: 'chat',
          title: notif.title,
          description: notif.message,
          date: notif.created_date,
          urgent: false,
          data: notif
        });
      });

      // Akuta fordonsärenden
      const urgentIssues = await base44.entities.MaintenanceIssue.filter(
        { 
          status: 'ny',
          severity: 'måste_stanna'
        }, 
        '-created_date', 
        10
      );
      urgentIssues.forEach(issue => {
        notifs.push({
          id: `issue-${issue.id}`,
          type: 'vehicle',
          title: 'AKUT: Fordonsärende',
          description: `${issue.registration_number} - ${issue.title}`,
          date: issue.created_date,
          urgent: true,
          data: issue
        });
      });

      // Fordon som behöver besiktning inom 30 dagar
      const vehicles = await base44.entities.Vehicle.list();
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      vehicles.forEach(vehicle => {
        if (vehicle.next_inspection_date) {
          const inspectionDate = new Date(vehicle.next_inspection_date);
          if (inspectionDate > now && inspectionDate < thirtyDaysFromNow) {
            notifs.push({
              id: `inspection-${vehicle.id}`,
              type: 'vehicle',
              title: 'Besiktning närmar sig',
              description: `${vehicle.registration_number} behöver besiktas`,
              date: now.toISOString(),
              urgent: false,
              data: vehicle
            });
          }
        }
        
        // Service inom 30 dagar
        if (vehicle.next_service_date) {
          const serviceDate = new Date(vehicle.next_service_date);
          if (serviceDate > now && serviceDate < thirtyDaysFromNow) {
            notifs.push({
              id: `service-${vehicle.id}`,
              type: 'vehicle',
              title: 'Service närmar sig',
              description: `${vehicle.registration_number} behöver service`,
              date: now.toISOString(),
              urgent: false,
              data: vehicle
            });
          }
        }
      });

      // Sortera efter datum
      return notifs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!user,
    refetchInterval: 2000, // Uppdatera varje 2 sekunder för realtidsuppdateringar
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      const id = notificationId.replace('notification-', '');
      return base44.entities.Notification.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const id = notificationId.replace('notification-', '');
      return base44.entities.Notification.update(id, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
    }
  });

  const handleDeleteNotification = (notificationId) => {
    if (notificationId.startsWith('notification-')) {
      deleteNotificationMutation.mutate(notificationId);
    }
  };

  const handleMarkAsRead = (notificationId) => {
    if (notificationId.startsWith('notification-')) {
      markAsReadMutation.mutate(notificationId);
      // Update badge count
      setTimeout(() => {
        const newUnreadCount = notifications.filter(n => !n.data?.is_read && n.id !== notificationId).length;
        if ('setAppBadge' in navigator) {
          if (newUnreadCount > 0) {
            navigator.setAppBadge(newUnreadCount);
          } else {
            navigator.clearAppBadge();
          }
        }
      }, 100);
    }
  };

  const unreadCount = notifications.filter(n => !n.data?.is_read).length;

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  // Update app badge with unread count
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount);
      } else {
        navigator.clearAppBadge();
      }
    }
  }, [unreadCount]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button 
          className="relative rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors p-3 -m-1 touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Bell className="h-6 w-6 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center rounded-full bg-rose-500 text-white text-xs font-semibold shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifikationer</SheetTitle>
        </SheetHeader>
        <NotificationsList 
          notifications={notifications} 
          onClose={() => setOpen(false)}
          onDelete={handleDeleteNotification}
          onMarkAsRead={handleMarkAsRead}
        />
      </SheetContent>
    </Sheet>
  );
}