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

      // Sortera efter datum
      return notifs.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!user,
    refetchInterval: 60000, // Uppdatera varje minut
  });

  const unreadCount = notifications.length;

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