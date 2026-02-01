// Supabase Client - För produktion
// Aktiveras genom att sätta VITE_API_MODE=supabase i .env

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Skapa Supabase-klient endast om konfigurationen finns
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mappa entitetsnamn till tabellnamn i Supabase
const tableNameMap = {
  'User': 'users',
  'Employee': 'employees',
  'Vehicle': 'vehicles',
  'Project': 'projects',
  'TimeEntry': 'time_entries',
  'LeaveRequest': 'leave_requests',
  'DrivingJournalEntry': 'driving_journal_entries',
  'Geofence': 'geofences',
  'NewsPost': 'news_posts',
  'Conversation': 'conversations',
  'Message': 'messages',
  'Notification': 'notifications',
  'PushSubscription': 'push_subscriptions',
  'Manual': 'manuals',
  'Document': 'documents',
  'FuelLog': 'fuel_logs',
  'MaintenanceIssue': 'maintenance_issues',
  'ApprovalRequest': 'approval_requests',
  'ProjectTask': 'project_tasks',
  'OnboardingTemplate': 'onboarding_templates',
  'OnboardingTask': 'onboarding_tasks',
  'WorkPolicy': 'work_policies',
  'JournalPolicy': 'journal_policies',
  'MileagePolicy': 'mileage_policies',
  'NotificationSettings': 'notification_settings',
  'WeeklyReport': 'weekly_reports',
  'ScheduleEvent': 'schedule_events',
  'BluetoothDevice': 'bluetooth_devices'
};

// Skapa entity-operationer för Supabase
export const createSupabaseEntity = (entityName) => {
  const tableName = tableNameMap[entityName] || entityName.toLowerCase() + 's';

  return {
    list: async (orderBy = 'created_at', limit = 100) => {
      const isDesc = orderBy.startsWith('-');
      const column = isDesc ? orderBy.slice(1) : orderBy;
      const mappedColumn = column === 'created_date' ? 'created_at' : column;

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(mappedColumn, { ascending: !isDesc })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },

    filter: async (conditions, orderBy = null, limit = 100) => {
      let query = supabase.from(tableName).select('*');

      // Applicera filter
      Object.entries(conditions).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      });

      // Sortering
      if (orderBy) {
        const isDesc = orderBy.startsWith('-');
        const column = isDesc ? orderBy.slice(1) : orderBy;
        const mappedColumn = column === 'created_date' ? 'created_at' : column;
        query = query.order(mappedColumn, { ascending: !isDesc });
      }

      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    create: async (data) => {
      const { data: created, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return created;
    },

    update: async (id, data) => {
      const { data: updated, error } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    },

    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  };
};

// Auth-wrapper för Supabase
export const createSupabaseAuth = () => ({
  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('Not authenticated');

    // Hämta användardata från vår users-tabell
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      ...userData
    };
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data.user;
  },

  signup: async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    if (error) throw error;
    return data.user;
  },

  logout: async (redirectUrl = null) => {
    await supabase.auth.signOut();
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin: (returnUrl = null) => {
    if (typeof window !== 'undefined') {
      const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login';
      window.location.href = url;
    }
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
});

export default supabase;
