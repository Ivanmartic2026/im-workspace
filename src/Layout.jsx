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

const TV_PAGES = ['TVDashboard', 'TVProjectDashboard'];

function LayoutContent({ children, currentPageName }) {
  if (TV_PAGES.includes(currentPageName)) {
    return <>{children}</>;
  }
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedPosition = sessionStorage.getItem(`scroll-${currentPageName}`);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition));
    }

    return () => {
      sessionStorage.setItem(`scroll-${currentPageName}`, window.scrollY.toString());
    };
  }, [currentPageName]);

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
  const isChildRoute = currentPageName && currentPageName !== 'Home';

  const hasFeatureAccess = (featureName) => {
    if (isAdmin) return true;
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
      if (!feature) return true;
      return hasFeatureAccess(feature);
    });
  };

  const items = getVisibleItems();
  const direction = location.state?.direction || 'forward';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#111]">
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

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[220px] flex-col z-50 bg-white dark:bg-[#111] border-r border-slate-100 dark:border-white/[0.06]">
        {/* Logo */}
        <div className="p-6 pb-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6951895d1643f7057890a865/daf37ea55_LogoLIGGANDE_IMvision_svartkopiaepskopia2.png"
            alt="IM Vision"
            className="h-7 object-contain dark:invert dark:opacity-90"
          />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {items.map(({ name, label, icon: Icon }) => {
            const isActive = currentPageName === name;
            return (
              <Link
                key={name}
                to={createPageUrl(name)}
                state={{ direction: 'forward' }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-neutral-500 hover:text-slate-900 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom area */}
        <div className="p-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
          <LanguageSwitcher />
          <NotificationBell user={user} />
        </div>
      </aside>

      {/* Mobile Header - Fixed Top (hidden on desktop) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 dark:bg-[#111]/95 backdrop-blur-xl border-b border-slate-100 dark:border-white/[0.06] z-50 safe-area-pt">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {isChildRoute ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-900 dark:text-neutral-200 hover:text-slate-600 dark:hover:text-white transition-colors -ml-2 px-2 py-1"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">{t('back') || 'Tillbaka'}</span>
            </button>
          ) : (
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6951895d1643f7057890a865/daf37ea55_LogoLIGGANDE_IMvision_svartkopiaepskopia2.png"
              alt="IM Vision"
              className="h-8 object-contain dark:invert dark:opacity-90"
            />
          )}

          <div className="flex gap-2">
            <LanguageSwitcher />
            <NotificationBell user={user} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20 lg:pb-8 pt-14 lg:pt-0 lg:pl-[220px] overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPageName}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: 0.2,
              ease: [0.25, 0.1, 0.25, 1]
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#111]/95 backdrop-blur-xl border-t border-slate-100 dark:border-white/[0.06] safe-area-pb z-50">
        <style>{`
          .nav-scroll::-webkit-scrollbar {
            height: 0;
            display: none;
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
                  state={{ direction: isActive ? 'back' : 'forward' }}
                  onClick={(e) => {
                    if (isActive && isChildRoute) {
                      e.preventDefault();
                      navigate(createPageUrl(name), { replace: true, state: { direction: 'back' } });
                    }
                  }}
                  className="relative flex flex-col items-center py-1.5 px-3 min-w-[56px] flex-shrink-0"
                >
                  <div className={`relative p-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white/10'
                      : 'hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                  }`}>
                    <Icon className={`h-5 w-5 transition-colors ${
                      isActive ? 'text-white dark:text-white' : 'text-slate-400 dark:text-neutral-600'
                    }`} />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-slate-900 dark:bg-white/10 rounded-xl -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'text-slate-900 dark:text-neutral-200' : 'text-slate-400 dark:text-neutral-600'
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