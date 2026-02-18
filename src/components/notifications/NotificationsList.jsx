import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertTriangle, ChevronRight, Trash2, Check, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const typeConfig = {
  news: {
    icon: Bell,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  leave: {
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  vehicle: {
    icon: AlertTriangle,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
  system: {
    icon: Bell,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  approval_needed: {
    icon: Bell,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  approved: {
    icon: Bell,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  rejected: {
    icon: Bell,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
  time_correction_needed: {
    icon: Bell,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  chat: {
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  }
};

function NotificationItem({ notification, idx, onDelete, onMarkAsRead, onNavigate }) {
  const config = typeConfig[notification.type] || typeConfig.system;
  const Icon = config.icon;
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, 0], [1, 0]);
  const readOpacity = useTransform(x, [0, 100], [0, 1]);
  const controls = useAnimation();

  const handleDragEnd = async (e, info) => {
    if (info.offset.x < -80) {
      // Animate out before deleting
      await controls.start({ opacity: 0, x: -300, transition: { duration: 0.2 } });
      onDelete?.(notification.id);
    } else if (info.offset.x > 80 && !notification.data?.is_read) {
      // Animate out before marking as read
      await controls.start({ opacity: 0, x: 300, transition: { duration: 0.2 } });
      onMarkAsRead?.(notification.id);
    } else {
      // Snap back if not swiped far enough
      x.set(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="relative"
    >
      {/* Delete action (swipe left) */}
      <motion.div 
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-500 rounded-xl"
        style={{ opacity: deleteOpacity }}
      >
        <Trash2 className="h-5 w-5 text-white" />
      </motion.div>

      {/* Read action (swipe right) */}
      {!notification.data?.is_read && (
        <motion.div 
          className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-green-500 rounded-xl"
          style={{ opacity: readOpacity }}
        >
          <Check className="h-5 w-5 text-white" />
        </motion.div>
      )}

      <motion.div
        drag="x"
        dragConstraints={{ 
          left: notification.id.startsWith('notification-') ? -100 : 0, 
          right: (notification.id.startsWith('notification-') && !notification.data?.is_read) ? 100 : 0 
        }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        animate={controls}
      >
        <Card 
          className={`border-l-4 ${config.borderColor} cursor-pointer hover:shadow-md transition-shadow bg-white`}
          onClick={() => onNavigate(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    {notification.title}
                  </h4>
                  {notification.urgent && (
                    <Badge variant="destructive" className="text-xs">
                      AKUT
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                  {notification.description}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {format(new Date(notification.date), "d MMM 'kl' HH:mm", { locale: sv })}
                  </p>
                  {notification.id.startsWith('notification-') && !notification.data?.is_read && (
                    <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">
                      NY
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function NotificationsList({ notifications, onClose, onDelete, onMarkAsRead }) {
  const navigate = useNavigate();

  const handleNavigate = (notification) => {
    // Markera som läst först
    if (notification.id.startsWith('notification-') && !notification.data?.is_read) {
      onMarkAsRead?.(notification.id);
    }

    // Navigera baserat på typ
    if (notification.type === 'news') {
      navigate(createPageUrl('Home'));
    } else if (notification.type === 'leave') {
      // Navigera till AdminTimeSystem med ledighet-godkännande
      navigate(createPageUrl('AdminTimeSystem'));
    } else if (notification.type === 'approval_needed') {
      // Navigera till AdminTimeSystem
      navigate(createPageUrl('AdminTimeSystem'));
    } else if (notification.type === 'vehicle') {
      navigate(createPageUrl('Vehicles'));
    } else if (notification.type === 'chat') {
      navigate(createPageUrl('Chat'));
    } else if (notification.type === 'time_correction_needed') {
      navigate(createPageUrl('TimeTracking'));
    } else if (notification.type === 'approved' || notification.type === 'rejected') {
      navigate(createPageUrl('TimeTracking'));
    } else {
      // Default till Home för systemnotifikationer
      navigate(createPageUrl('Home'));
    }
    
    onClose();
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Bell className="h-16 w-16 text-slate-300 mb-4" />
        <p className="text-slate-500 text-center">Inga notifikationer</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)] pb-4">
      {notifications.map((notification, idx) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          idx={idx}
          onDelete={onDelete}
          onMarkAsRead={onMarkAsRead}
          onNavigate={handleNavigate}
        />
      ))}
    </div>
  );
}