// API Client - Ersätter Base44 SDK
// Kan köras med mock-data lokalt eller mot Supabase i produktion

const API_MODE = import.meta.env.VITE_API_MODE || 'mock'; // 'mock' | 'supabase'

// In-memory storage för mock-data
const mockStorage = new Map();

// Generera unikt ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock implementation av entity operations
const createMockEntity = (entityName) => {
  // Initiera storage för denna entitet om den inte finns
  if (!mockStorage.has(entityName)) {
    mockStorage.set(entityName, []);
  }

  return {
    // Hämta alla records
    list: async (orderBy = 'created_date', limit = 100) => {
      const data = mockStorage.get(entityName) || [];
      const sorted = [...data].sort((a, b) => {
        const field = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy;
        const dir = orderBy.startsWith('-') ? -1 : 1;
        if (a[field] < b[field]) return -1 * dir;
        if (a[field] > b[field]) return 1 * dir;
        return 0;
      });
      return sorted.slice(0, limit);
    },

    // Filtrera records
    filter: async (conditions, orderBy = null, limit = 100) => {
      let data = mockStorage.get(entityName) || [];

      // Filtrera baserat på conditions
      data = data.filter(item => {
        return Object.entries(conditions).every(([key, value]) => {
          if (Array.isArray(value)) {
            return value.includes(item[key]);
          }
          return item[key] === value;
        });
      });

      // Sortera om orderBy är angivet
      if (orderBy) {
        const field = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy;
        const dir = orderBy.startsWith('-') ? -1 : 1;
        data.sort((a, b) => {
          if (a[field] < b[field]) return -1 * dir;
          if (a[field] > b[field]) return 1 * dir;
          return 0;
        });
      }

      return data.slice(0, limit);
    },

    // Skapa ny record
    create: async (data) => {
      const records = mockStorage.get(entityName) || [];
      const newRecord = {
        id: generateId(),
        ...data,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      };
      records.push(newRecord);
      mockStorage.set(entityName, records);
      return newRecord;
    },

    // Uppdatera record
    update: async (id, data) => {
      const records = mockStorage.get(entityName) || [];
      const index = records.findIndex(r => r.id === id);
      if (index === -1) {
        throw new Error(`${entityName} with id ${id} not found`);
      }
      records[index] = {
        ...records[index],
        ...data,
        updated_date: new Date().toISOString()
      };
      mockStorage.set(entityName, records);
      return records[index];
    },

    // Ta bort record
    delete: async (id) => {
      const records = mockStorage.get(entityName) || [];
      const filtered = records.filter(r => r.id !== id);
      mockStorage.set(entityName, filtered);
      return { success: true };
    },

    // Hämta en specifik record
    get: async (id) => {
      const records = mockStorage.get(entityName) || [];
      return records.find(r => r.id === id) || null;
    }
  };
};

// Auth implementation
const createAuth = () => {
  let currentUser = null;

  // Ladda användare från localStorage om den finns
  const storedUser = typeof window !== 'undefined'
    ? localStorage.getItem('app_current_user')
    : null;

  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      console.error('Failed to parse stored user:', e);
    }
  }

  return {
    me: async () => {
      if (!currentUser) {
        // I mock-läge, returnera en default-användare
        if (API_MODE === 'mock') {
          currentUser = {
            id: 'user-1',
            email: 'demo@example.com',
            full_name: 'Demo Användare',
            role: 'admin'
          };
          localStorage.setItem('app_current_user', JSON.stringify(currentUser));
        } else {
          throw new Error('Not authenticated');
        }
      }
      return currentUser;
    },

    login: async (email, password) => {
      // I mock-läge, acceptera vilken inloggning som helst
      if (API_MODE === 'mock') {
        currentUser = {
          id: 'user-1',
          email: email,
          full_name: email.split('@')[0],
          role: 'admin'
        };
        localStorage.setItem('app_current_user', JSON.stringify(currentUser));
        return currentUser;
      }
      throw new Error('Login not implemented for this mode');
    },

    logout: (redirectUrl = null) => {
      currentUser = null;
      localStorage.removeItem('app_current_user');
      if (redirectUrl && typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      }
    },

    redirectToLogin: (returnUrl = null) => {
      // I mock-läge, gå till login-sidan
      if (typeof window !== 'undefined') {
        const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login';
        window.location.href = url;
      }
    },

    setUser: (user) => {
      currentUser = user;
      if (user) {
        localStorage.setItem('app_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('app_current_user');
      }
    },

    isAuthenticated: () => !!currentUser
  };
};

// Skapa entities proxy som automatiskt skapar entiteter vid behov
const createEntitiesProxy = () => {
  const cache = {};

  return new Proxy({}, {
    get: (target, entityName) => {
      if (!cache[entityName]) {
        cache[entityName] = createMockEntity(entityName);
      }
      return cache[entityName];
    }
  });
};

// Huvudexport - API-klienten
export const api = {
  auth: createAuth(),
  entities: createEntitiesProxy(),

  // Utility för att initiera mock-data
  initMockData: (entityName, data) => {
    mockStorage.set(entityName, data);
  },

  // Utility för att rensa all mock-data
  clearMockData: () => {
    mockStorage.clear();
  },

  // Hämta current mode
  getMode: () => API_MODE
};

// Alias för bakåtkompatibilitet
export const base44 = api;

export default api;
