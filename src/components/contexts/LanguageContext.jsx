import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const LanguageContext = createContext();

export const translations = {
  sv: {
    // Navigation
    nav_home: 'Hem',
    nav_time: 'Tid',
    nav_vehicles: 'Fordon',
    nav_journal: 'Körjournal',
    nav_manuals: 'Manualer',
    nav_chat: 'Chat',
    nav_profile: 'Profil',
    nav_projects: 'Projekt',
    nav_admin: 'Admin',
    
    // Home page
    welcome_title: 'Welcome to IM Workspace',
    clock_in: 'Stämpla in',
    clock_out: 'Stämpla ut',
    clocking_in: 'Stämplar in...',
    clocking_out: 'Stämplar ut...',
    clocked_in: 'Instämplad',
    select_project: 'Checka in på projekt/kostnadsställe',
    must_select_project: '⚠️ Checka in på projekt/kostnadsställe',
    select_project_before: 'Du måste välja ett projekt innan du stämplar in',
    location_required: 'Din plats måste registreras för instämpling. Tillåt platsåtkomst i webbläsaren och försök igen.',
    new_news: 'Ny nyhet',
    no_news: 'Inga nyheter att visa',
    project: 'Projekt',
    
    // Common
    loading: 'Laddar...',
    save: 'Spara',
    cancel: 'Avbryt',
    delete: 'Ta bort',
    edit: 'Redigera',
    close: 'Stäng',
    search: 'Sök',
    filter: 'Filtrera',
    yes: 'Ja',
    no: 'Nej',
    
    // Settings
    language: 'Språk',
    swedish: 'Svenska',
    english: 'English',
    theme: 'Tema',
    notifications: 'Notifikationer',
  },
  en: {
    // Navigation
    nav_home: 'Home',
    nav_time: 'Time',
    nav_vehicles: 'Vehicles',
    nav_journal: 'Driving Journal',
    nav_manuals: 'Manuals',
    nav_chat: 'Chat',
    nav_profile: 'Profile',
    nav_projects: 'Projects',
    nav_admin: 'Admin',
    
    // Home page
    welcome_title: 'Welcome to IM Workspace',
    clock_in: 'Clock in',
    clock_out: 'Clock out',
    clocking_in: 'Clocking in...',
    clocking_out: 'Clocking out...',
    clocked_in: 'Clocked in',
    select_project: 'Check in to project/cost center',
    must_select_project: '⚠️ Check in to project/cost center',
    select_project_before: 'You must select a project before clocking in',
    location_required: 'Your location must be registered for clock in. Allow location access in your browser and try again.',
    new_news: 'New post',
    no_news: 'No news to display',
    project: 'Project',
    
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    yes: 'Yes',
    no: 'No',
    
    // Settings
    language: 'Language',
    swedish: 'Svenska',
    english: 'English',
    theme: 'Theme',
    notifications: 'Notifications',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('sv');
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData?.email) {
          const employees = await base44.entities.Employee.filter({ user_email: userData.email });
          if (employees.length > 0) {
            setEmployee(employees[0]);
            const lang = employees[0].language_preference || 'sv';
            setLanguage(lang);
          }
        }
      } catch (error) {
        console.error('Failed to load user language:', error);
      }
    };
    
    loadUserLanguage();
  }, []);

  const changeLanguage = async (newLang) => {
    setLanguage(newLang);
    
    if (employee?.id) {
      try {
        await base44.entities.Employee.update(employee.id, {
          language_preference: newLang
        });
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};