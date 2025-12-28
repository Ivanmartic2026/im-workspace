import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { motion } from 'framer-motion';
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
  }
};

export default function NotificationsList({ notifications, onClose }) {
  const navigate = useNavigate();

  const handleClick = (notification) => {
    if (notification.type === 'news') {
      navigate(createPageUrl('Home'));
    } else if (notification.type === 'leave') {
      navigate(createPageUrl('Leave'));
    } else if (notification.type === 'vehicle') {
      navigate(createPageUrl('VehicleReports'));
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
                      {notification.urgent && (
                        <Badge variant="destructive" className="text-xs">
                          AKUT
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {notification.description}
                    </p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(notification.date), "d MMM 'kl' HH:mm", { locale: sv })}
                    </p>
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