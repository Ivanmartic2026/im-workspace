// Mock-data för lokal utveckling
// Realistisk data på svenska för testning

export const mockUsers = [
  {
    id: 'user-admin',
    email: 'ivan@imvision.se',
    full_name: 'Ivan',
    role: 'admin',
    password: 'IM2025',
    created_date: '2024-01-01T08:00:00Z'
  },
  {
    id: 'user-1',
    email: 'anna.andersson@example.com',
    full_name: 'Anna Andersson',
    role: 'admin',
    created_date: '2024-01-15T08:00:00Z'
  },
  {
    id: 'user-2',
    email: 'erik.svensson@example.com',
    full_name: 'Erik Svensson',
    role: 'user',
    created_date: '2024-02-01T08:00:00Z'
  },
  {
    id: 'user-3',
    email: 'maria.johansson@example.com',
    full_name: 'Maria Johansson',
    role: 'user',
    created_date: '2024-02-15T08:00:00Z'
  },
  {
    id: 'user-4',
    email: 'johan.lindberg@example.com',
    full_name: 'Johan Lindberg',
    role: 'manager',
    created_date: '2024-03-01T08:00:00Z'
  }
];

export const mockEmployees = [
  {
    id: 'emp-admin',
    user_email: 'ivan@imvision.se',
    first_name: 'Ivan',
    last_name: '',
    department: 'Administration',
    position: 'Administratör',
    phone: '',
    start_date: '2024-01-01',
    status: 'active',
    assigned_features: ['TimeTracking', 'Vehicles', 'GPS', 'DrivingJournal', 'Manuals', 'Chat', 'Reports'],
    created_date: '2024-01-01T08:00:00Z'
  },
  {
    id: 'emp-1',
    user_email: 'anna.andersson@example.com',
    first_name: 'Anna',
    last_name: 'Andersson',
    department: 'Administration',
    position: 'VD',
    phone: '070-123 45 67',
    start_date: '2020-01-15',
    status: 'active',
    created_date: '2024-01-15T08:00:00Z'
  },
  {
    id: 'emp-2',
    user_email: 'erik.svensson@example.com',
    first_name: 'Erik',
    last_name: 'Svensson',
    department: 'Teknik',
    position: 'Tekniker',
    phone: '070-234 56 78',
    start_date: '2022-03-01',
    status: 'active',
    created_date: '2024-02-01T08:00:00Z'
  },
  {
    id: 'emp-3',
    user_email: 'maria.johansson@example.com',
    first_name: 'Maria',
    last_name: 'Johansson',
    department: 'Försäljning',
    position: 'Säljare',
    phone: '070-345 67 89',
    start_date: '2023-06-15',
    status: 'active',
    created_date: '2024-02-15T08:00:00Z'
  },
  {
    id: 'emp-4',
    user_email: 'johan.lindberg@example.com',
    first_name: 'Johan',
    last_name: 'Lindberg',
    department: 'Teknik',
    position: 'Projektledare',
    phone: '070-456 78 90',
    start_date: '2021-09-01',
    status: 'active',
    created_date: '2024-03-01T08:00:00Z'
  }
];

export const mockVehicles = [
  {
    id: 'veh-1',
    registration_number: 'ABC 123',
    make: 'Volvo',
    model: 'XC60',
    year: 2022,
    type: 'Personbil',
    status: 'available',
    mileage: 45000,
    fuel_type: 'Diesel',
    assigned_employee_id: null,
    created_date: '2024-01-01T08:00:00Z'
  },
  {
    id: 'veh-2',
    registration_number: 'DEF 456',
    make: 'Volkswagen',
    model: 'Transporter',
    year: 2021,
    type: 'Skåpbil',
    status: 'in_use',
    mileage: 78000,
    fuel_type: 'Diesel',
    assigned_employee_id: 'emp-2',
    created_date: '2024-01-01T08:00:00Z'
  },
  {
    id: 'veh-3',
    registration_number: 'GHI 789',
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    type: 'Personbil',
    status: 'available',
    mileage: 15000,
    fuel_type: 'El',
    assigned_employee_id: null,
    created_date: '2024-02-01T08:00:00Z'
  }
];

export const mockProjects = [
  {
    id: 'proj-1',
    name: 'Kontorsrenovering Storgatan',
    description: 'Renovering av kontorslokaler på Storgatan 15',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-06-30',
    budget_hours: 500,
    used_hours: 234,
    client: 'Fastighets AB',
    created_date: '2024-01-01T08:00:00Z'
  },
  {
    id: 'proj-2',
    name: 'IT-infrastruktur Industrivägen',
    description: 'Installation av nätverk och servrar',
    status: 'active',
    start_date: '2024-02-15',
    end_date: '2024-04-30',
    budget_hours: 200,
    used_hours: 89,
    client: 'Industri AB',
    created_date: '2024-02-15T08:00:00Z'
  },
  {
    id: 'proj-3',
    name: 'Underhåll Q1 2024',
    description: 'Löpande underhållsarbeten',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-03-31',
    budget_hours: 300,
    used_hours: 267,
    client: 'Internt',
    created_date: '2024-01-01T08:00:00Z'
  }
];

export const mockTimeEntries = [
  {
    id: 'time-1',
    employee_id: 'emp-2',
    project_id: 'proj-1',
    date: '2024-01-29',
    start_time: '07:00',
    end_time: '16:00',
    break_minutes: 60,
    hours: 8,
    description: 'Elinstallation rum 201-205',
    status: 'approved',
    created_date: '2024-01-29T16:00:00Z'
  },
  {
    id: 'time-2',
    employee_id: 'emp-2',
    project_id: 'proj-1',
    date: '2024-01-30',
    start_time: '07:00',
    end_time: '15:30',
    break_minutes: 30,
    hours: 8,
    description: 'Fortsatt elinstallation',
    status: 'approved',
    created_date: '2024-01-30T15:30:00Z'
  },
  {
    id: 'time-3',
    employee_id: 'emp-3',
    project_id: 'proj-2',
    date: '2024-01-30',
    start_time: '08:00',
    end_time: '17:00',
    break_minutes: 60,
    hours: 8,
    description: 'Kundmöte och offertarbete',
    status: 'pending',
    created_date: '2024-01-30T17:00:00Z'
  }
];

export const mockNewsPosts = [
  {
    id: 'news-1',
    title: 'Välkommen till nya intranätet!',
    content: 'Vi har lanserat ett nytt intranät för att förbättra kommunikationen inom företaget. Här kommer ni kunna hitta viktig information, nyheter och verktyg för ert dagliga arbete.',
    author_id: 'emp-1',
    author_name: 'Anna Andersson',
    is_important: true,
    requires_acknowledgment: true,
    created_date: '2024-01-28T10:00:00Z'
  },
  {
    id: 'news-2',
    title: 'Nya säkerhetsrutiner',
    content: 'Från och med 1 februari gäller nya säkerhetsrutiner på alla arbetsplatser. Läs igenom dokumentet som delats ut och signera att ni tagit del av informationen.',
    author_id: 'emp-4',
    author_name: 'Johan Lindberg',
    is_important: true,
    requires_acknowledgment: true,
    created_date: '2024-01-25T14:00:00Z'
  },
  {
    id: 'news-3',
    title: 'Fredagsfika denna vecka',
    content: 'Glöm inte fredagsfikat kl 14:00 i lunchrummet. Denna vecka bjuder vi på prinsesstårta!',
    author_id: 'emp-1',
    author_name: 'Anna Andersson',
    is_important: false,
    requires_acknowledgment: false,
    created_date: '2024-01-29T08:00:00Z'
  }
];

export const mockLeaveRequests = [
  {
    id: 'leave-1',
    employee_id: 'emp-3',
    type: 'vacation',
    start_date: '2024-02-19',
    end_date: '2024-02-23',
    days: 5,
    status: 'pending',
    reason: 'Sportlov med familjen',
    created_date: '2024-01-20T10:00:00Z'
  },
  {
    id: 'leave-2',
    employee_id: 'emp-2',
    type: 'sick',
    start_date: '2024-01-22',
    end_date: '2024-01-22',
    days: 1,
    status: 'approved',
    reason: 'Sjuk',
    created_date: '2024-01-22T07:00:00Z'
  }
];

export const mockDrivingJournalEntries = [
  {
    id: 'journal-1',
    vehicle_id: 'veh-2',
    employee_id: 'emp-2',
    date: '2024-01-29',
    start_location: 'Kontoret, Stockholm',
    end_location: 'Storgatan 15, Stockholm',
    start_mileage: 77850,
    end_mileage: 77865,
    distance_km: 15,
    purpose: 'business',
    project_id: 'proj-1',
    notes: 'Transport av verktyg till arbetsplatsen',
    created_date: '2024-01-29T07:30:00Z'
  },
  {
    id: 'journal-2',
    vehicle_id: 'veh-2',
    employee_id: 'emp-2',
    date: '2024-01-29',
    start_location: 'Storgatan 15, Stockholm',
    end_location: 'Kontoret, Stockholm',
    start_mileage: 77865,
    end_mileage: 77880,
    distance_km: 15,
    purpose: 'business',
    project_id: 'proj-1',
    notes: 'Hemresa',
    created_date: '2024-01-29T16:30:00Z'
  }
];

export const mockGeofences = [
  {
    id: 'geo-1',
    name: 'Huvudkontoret',
    latitude: 59.3293,
    longitude: 18.0686,
    radius: 100,
    type: 'office',
    is_active: true,
    created_date: '2024-01-01T08:00:00Z'
  },
  {
    id: 'geo-2',
    name: 'Storgatan 15',
    latitude: 59.3350,
    longitude: 18.0550,
    radius: 50,
    type: 'worksite',
    is_active: true,
    created_date: '2024-01-15T08:00:00Z'
  }
];

export const mockNotifications = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    title: 'Ny ledighetsansökan',
    message: 'Maria Johansson har ansökt om semester 19-23 februari',
    type: 'leave_request',
    is_read: false,
    created_date: '2024-01-20T10:00:00Z'
  },
  {
    id: 'notif-2',
    user_id: 'user-2',
    title: 'Tidrapport godkänd',
    message: 'Din tidrapport för vecka 4 har godkänts',
    type: 'time_approved',
    is_read: true,
    created_date: '2024-01-28T15:00:00Z'
  }
];

export const mockManuals = [
  {
    id: 'manual-1',
    title: 'Säkerhetshandbok',
    description: 'Säkerhetsrutiner och riktlinjer för alla anställda',
    category: 'Säkerhet',
    content: '# Säkerhetshandbok\n\nDetta dokument beskriver våra säkerhetsrutiner...',
    version: '2.1',
    is_published: true,
    created_date: '2024-01-01T08:00:00Z'
  },
  {
    id: 'manual-2',
    title: 'Tidrapportering - Guide',
    description: 'Hur du rapporterar din tid korrekt',
    category: 'Administration',
    content: '# Tidrapportering\n\n## Steg 1: Logga in...',
    version: '1.0',
    is_published: true,
    created_date: '2024-01-10T08:00:00Z'
  }
];

export const mockApprovalRequests = [
  {
    id: 'approval-1',
    type: 'time_entry',
    requester_id: 'emp-3',
    approver_id: 'emp-4',
    status: 'pending',
    data: { time_entry_id: 'time-3' },
    created_date: '2024-01-30T17:00:00Z'
  }
];

export const mockConversations = [
  {
    id: 'conv-1',
    participants: ['user-1', 'user-2'],
    last_message: 'Ok, vi ses imorgon!',
    updated_date: '2024-01-29T15:30:00Z',
    created_date: '2024-01-25T10:00:00Z'
  }
];

export const mockMessages = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    content: 'Hej Erik! Kan du ta en titt på ritningarna för Storgatan?',
    is_read: true,
    created_date: '2024-01-29T14:00:00Z'
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    sender_id: 'user-2',
    content: 'Absolut, jag kollar på det direkt!',
    is_read: true,
    created_date: '2024-01-29T14:15:00Z'
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    sender_id: 'user-2',
    content: 'Ok, vi ses imorgon!',
    is_read: false,
    created_date: '2024-01-29T15:30:00Z'
  }
];

// Funktion för att initiera all mock-data
export const initializeAllMockData = (api) => {
  api.initMockData('User', mockUsers);
  api.initMockData('Employee', mockEmployees);
  api.initMockData('Vehicle', mockVehicles);
  api.initMockData('Project', mockProjects);
  api.initMockData('TimeEntry', mockTimeEntries);
  api.initMockData('NewsPost', mockNewsPosts);
  api.initMockData('LeaveRequest', mockLeaveRequests);
  api.initMockData('DrivingJournalEntry', mockDrivingJournalEntries);
  api.initMockData('Geofence', mockGeofences);
  api.initMockData('Notification', mockNotifications);
  api.initMockData('Manual', mockManuals);
  api.initMockData('ApprovalRequest', mockApprovalRequests);
  api.initMockData('Conversation', mockConversations);
  api.initMockData('Message', mockMessages);

  // Tomma entiteter som behövs
  api.initMockData('FuelLog', []);
  api.initMockData('MaintenanceIssue', []);
  api.initMockData('Document', []);
  api.initMockData('PushSubscription', []);
  api.initMockData('ProjectTask', []);
  api.initMockData('OnboardingTemplate', []);
  api.initMockData('OnboardingTask', []);
  api.initMockData('BluetoothDevice', []);
  api.initMockData('NotificationSettings', []);
  api.initMockData('JournalPolicy', []);
  api.initMockData('WorkPolicy', []);
  api.initMockData('WeeklyReport', []);
  api.initMockData('ScheduleEvent', []);
  api.initMockData('MileagePolicy', []);

  console.log('Mock data initialized successfully!');
};
