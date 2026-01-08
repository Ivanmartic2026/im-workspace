
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
import { useQuery } from '@tanstack/react-query';

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);

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
    refetchInterval: 5000, // Uppdatera varje 5 sekunder
  });

  const unreadCount = notifications.filter(n => !n.data?.is_read).length;

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative rounded-full hover:bg-slate-100"
        >
          <Bell className="h-5 w-5 text-slate-700" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-rose-500 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifikationer</SheetTitle>
        </SheetHeader>
        <NotificationsList 
          notifications={notifications} 
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
