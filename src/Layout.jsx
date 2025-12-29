import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, FileText, Calendar, Palmtree, Users, User, Car, Navigation, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Home', label: 'Hem', icon: Home },
  { name: 'Vehicles', label: 'Fordon', icon: Car },
  { name: 'GPS', label: 'GPS', icon: Navigation },
  { name: 'DrivingJournal', label: 'Körjournal', icon: FileText },
  { name: 'Employees', label: 'Personal', icon: Users },
  { name: 'Reports', label: 'Rapport', icon: BarChart3 },
  { name: 'Leave', label: 'Tid', icon: Palmtree },
  { name: 'Profile', label: 'Profil', icon: User },
];

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --color-primary: 15 23 42;
          --color-accent: 99 102 241;
        }
      `}</style>
      
      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 safe-area-pb z-50">
        <div className="max-w-2xl mx-auto px-1">
          <div className="flex items-center justify-around py-2">
            {navItems.map(({ name, label, icon: Icon }) => {
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