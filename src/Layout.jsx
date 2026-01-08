import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, FileText, Calendar, Clock, Users, User, Car, Navigation, BarChart3, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import NotificationBell from './components/notifications/NotificationBell';

const navItems = [
  { name: 'Home', label: 'Hem', icon: Home },
  { name: 'Vehicles', label: 'Fordon', icon: Car },
  { name: 'GPS', label: 'GPS', icon: Navigation },
  { name: 'DrivingJournal', label: 'Körjournal', icon: FileText },
  { name: 'Manuals', label: 'Manualer', icon: BookOpen },
  { name: 'TimeTracking', label: 'Tid', icon: Clock },
  { name: 'Profile', label: 'Profil', icon: User },
];

const adminNavItems = [
  ...navItems,
  { name: 'Admin', label: 'Admin', icon: BarChart3 }
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isAdmin = user?.role === 'admin';
  const items = isAdmin ? adminNavItems : navItems;

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --color-primary: 15 23 42;
          --color-accent: 99 102 241;
        }
        html, body {
          width: 100%;
          height: 100%;
          -webkit-user-select: none;
          user-select: none;
          -webkit-user-scalable: no;
          -webkit-touch-callout: none;
        }
        @supports(padding: max(0px)) {
          body {
            padding-left: max(12px, env(safe-area-inset-left));
            padding-right: max(12px, env(safe-area-inset-right));
          }
        }
      `}</style>

      {/* Notification Bell - Fixed Top Right */}
      <div className="fixed top-3 right-3 z-50">
        <NotificationBell user={user} />
      </div>
      
      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 safe-area-pb z-50">
        <div className="max-w-2xl mx-auto px-1">
          <div className="flex items-center justify-around py-2">
            {items.map(({ name, label, icon: Icon }) => {
              const isActive = currentPageName === name;
              return (
                <Link
                  key={name}
                  to={createPageUrl(name)}
                  className="relative flex flex-col items-center py-1.5 px-3 min-w-[56px]"
                >
                  <div className={`relative p-2 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-slate-900' 
                      : 'hover:bg-slate-100'
                  }`}>
                    <Icon className={`h-5 w-5 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`} />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-slate-900 rounded-xl -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium transition-colors ${
                    isActive ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}