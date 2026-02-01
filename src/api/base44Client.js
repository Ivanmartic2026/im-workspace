// Re-export från nya API-klienten för bakåtkompatibilitet
// Alla komponenter som importerar 'base44' kommer nu använda den nya klienten

import { api, base44 } from './client';
import { initializeAllMockData } from './mockData';

// Initiera mock-data om vi kör i mock-läge
if (api.getMode() === 'mock') {
  initializeAllMockData(api);
}

export { api, base44 };
export default api;
