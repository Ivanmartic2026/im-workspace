import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, FileText, Calendar, Clock, Users, User, Car, Navigation, BarChart3, BookOpen, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import NotificationBell from './components/notifications/NotificationBell';
import ServiceWorkerManager from './components/notifications/ServiceWorkerManager';
import { LanguageProvider, useLanguage } from './components/contexts/LanguageContext';
import LanguageSwitcher from './components/settings/LanguageSwitcher';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function LayoutContent({ children, currentPageName }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { name: 'Home', label: t('nav_home'), icon: Home },
    { name: 'TimeTracking', label: t('nav_time'), icon: Clock },
    { name: 'Vehicles', label: t('nav_vehicles'), icon: Car },
    { name: 'DrivingJournal', label: t('nav_journal'), icon: FileText },
    { name: 'Manuals', label: t('nav_manuals'), icon: BookOpen },
    { name: 'Chat', label: t('nav_chat'), icon: MessageCircle },
    { name: 'Profile', label: t('nav_profile'), icon: User },
  ];

  const adminNavItems = [
    ...navItems,
    { name: 'Projects', label: t('nav_projects'), icon: BarChart3 },
    { name: 'Admin', label: t('nav_admin'), icon: BarChart3 }
  ];

  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const fetchUserAndEmployee = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData?.email) {
          const employees = await base44.entities.Employee.filter({ user_email: userData.email });
          if (employees.length > 0) {
            setEmployee(employees[0]);
          }
        }
      } catch (error) {
        setUser(null);
        setEmployee(null);
      }
    };
    
    fetchUserAndEmployee();
  }, []);

  const isAdmin = user?.role === 'admin';
  
  // Check if we're on a child route (not home)
  const isChildRoute = currentPageName && currentPageName !== 'Home';
  
  // Filter navigation items based on user's assigned features
  const hasFeatureAccess = (featureName) => {
    if (isAdmin) return true; // Admins have access to everything
    if (!employee?.assigned_features) return false;
    return employee.assigned_features.includes(featureName);
  };

  const getVisibleItems = () => {
    let baseItems = isAdmin ? adminNavItems : navItems;
    return baseItems.filter(item => {
      const featureMap = {
        'TimeTracking': 'TimeTracking',
        'Vehicles': 'Vehicles',
        'DrivingJournal': 'GPS',
        'Manuals': 'Manuals',
        'Chat': 'Chat',
        'Admin': 'Admin'
      };
      const feature = featureMap[item.name];
      if (!feature) return true; // Show items without feature mapping
      return hasFeatureAccess(feature);
    });
  };

  const items = getVisibleItems();

  // Detect direction for page transitions
  const direction = location.state?.direction || 'forward';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <ServiceWorkerManager />
      <style>{`
        :root {
          --color-primary: 15 23 42;
          --color-accent: 99 102 241;
        }
        html, body {
            width: 100%;
            height: 100%;
            -webkit-user-scalable: no;
          }
        @supports(padding: max(0px)) {
          body {
            padding-left: max(12px, env(safe-area-inset-left));
            padding-right: max(12px, env(safe-area-inset-right));
          }
        }
      `}</style>

      {/* Mobile Header - Fixed Top */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800 z-50 safe-area-pt">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {isChildRoute ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors -ml-2 px-2 py-1"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">{t('back') || 'Tillbaka'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center">
                <span className="text-white dark:text-slate-900 font-bold text-sm">IV</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">ImVision</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <LanguageSwitcher />
            <NotificationBell user={user} />
          </div>
        </div>
      </div>
      
      {/* Main Content with Page Transitions */}
      <main className="pb-20 pt-14 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPageName}
            initial={{ 
              x: direction === 'back' ? '-100%' : '100%',
              opacity: 0 
            }}
            animate={{ 
              x: 0,
              opacity: 1 
            }}
            exit={{ 
              x: direction === 'back' ? '100%' : '-100%',
              opacity: 0 
            }}
            transition={{ 
              type: 'tween',
              duration: 0.3,
              ease: [0.32, 0.72, 0, 1]
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 safe-area-pb z-50">
        <style>{`
          .nav-scroll::-webkit-scrollbar {
            height: 4px;
          }
          .nav-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .nav-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 2px;
          }
          .nav-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        <div className="w-full overflow-x-auto nav-scroll">
          <div className="flex items-center justify-start md:justify-around py-2 px-1 min-w-min md:min-w-0 md:max-w-2xl md:mx-auto gap-1">
            {items.map(({ name, label, icon: Icon }) => {
              const isActive = currentPageName === name;
              return (
                <Link
                  key={name}
                  to={createPageUrl(name)}
                  onClick={(e) => {
                    // If clicking active tab, reset to root URL
                    if (isActive && window.history.state?.idx > 0) {
                      e.preventDefault();
                      window.history.pushState({ direction: 'back' }, '', createPageUrl(name));
                      window.location.reload();
                    }
                  }}
                  className="relative flex flex-col items-center py-1.5 px-3 min-w-[56px] flex-shrink-0"
                >
                  <div className={`relative p-2 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-slate-900 dark:bg-white' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}>
                    <Icon className={`h-5 w-5 transition-colors ${
                      isActive ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
                    }`} />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-slate-900 dark:bg-white rounded-xl -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
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

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </LanguageProvider>
  );
}