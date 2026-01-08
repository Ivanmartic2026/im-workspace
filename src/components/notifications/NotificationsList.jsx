import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertTriangle, ChevronRight, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

import { MessageCircle } from 'lucide-react';

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

export default function NotificationsList({ notifications, onClose, onDelete, onMarkAsRead }) {
  const navigate = useNavigate();

  const handleClick = (notification) => {
    if (notification.type === 'news') {
      navigate(createPageUrl('Home'));
    } else if (notification.type === 'leave') {
      navigate(createPageUrl('Leave'));
    } else if (notification.type === 'vehicle') {
      navigate(createPageUrl('VehicleReports'));
    } else if (notification.type === 'chat') {
      navigate(createPageUrl('Chat'));
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
    <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
      {notifications.map((notification, idx) => {
        const config = typeConfig[notification.type];
        const Icon = config.icon;

        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card 
              className={`border-l-4 ${config.borderColor} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleClick(notification)}
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
                        <div className="flex items-center gap-1">
                          {notification.urgent && (
                            <Badge variant="destructive" className="text-xs">
                              AKUT
                            </Badge>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(notification.id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                            title="Ta bort"
                          >
                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                          </button>
                        </div>
                      </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {notification.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                       {format(new Date(notification.date + 'Z'), "d MMM 'kl' HH:mm", { locale: sv })}
                     </p>
                      {!notification.data?.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead?.(notification.id);
                          }}
                          className="ml-2 p-1 hover:bg-slate-200 rounded transition-colors"
                          title="Markera som läst"
                        >
                          <Check className="h-4 w-4 text-indigo-600" />
                        </button>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}