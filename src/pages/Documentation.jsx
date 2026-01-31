import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Code, Database, Settings, Package, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function Documentation() {
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} kopierad!`);
    setTimeout(() => setCopied(''), 2000);
  };

  const frontendEnv = `# ============================================
# FRONTEND .env.example (Endast lokal development)
# ============================================
# Dessa används när du kör "npm run dev" lokalt
# I produktion hanteras dessa automatiskt av Base44

# Base44 Platform Connection
VITE_BASE44_APP_ID=your-app-id-from-dashboard
VITE_BASE44_API_URL=https://api.base44.com

# ============================================
# OBS: Backend functions körs ALLTID på Base44
# Du kan inte köra functions lokalt utan Base44
# ============================================`;

  const backendEnv = `# ============================================
# BACKEND .env (Deno Deploy Functions)
# ============================================
# Sätt dessa i Base44 Dashboard → Settings → Environment Variables
# Dessa är SECRETS och ska aldrig commitas

# ===== OBLIGATORISKA SECRETS =====

# GalaGPS API Integration (GPS-spårning)
GALAGPS_USERNAME=your-galagps-username
GALAGPS_PASSWORD=your-galagps-password
GALAGPS_URL=https://api.galagps.com

# ===== AUTO-HANTERADE AV BASE44 =====
# Dessa sätts automatiskt, du behöver INTE sätta dem manuellt

# BASE44_APP_ID=auto-generated-app-id
# BASE44_API_URL=https://api.base44.com

# Web Push Notifications (VAPID)
# VAPID_PUBLIC_KEY=auto-generated-by-base44
# VAPID_PRIVATE_KEY=auto-generated-by-base44

# ===== OPTIONAL (via Base44 Integrations) =====
# OpenAI används via base44.integrations.Core.InvokeLLM
# ingen separat API key behövs - hanteras av Base44
# OPENAI_API_KEY=handled-by-base44-integrations`;

  const externalEndpoints = `# ============================================
# EXTERNA API ENDPOINTS & BEROENDEN
# ============================================

# === Base44 Platform ===
Base URL: https://api.base44.com
Auth: JWT Bearer token (auto-hanterad av SDK)
SDK: @base44/sdk@0.8.3

Endpoints som används:
  - /auth/login
  - /auth/me
  - /entities/{EntityName}
  - /functions/{functionName}
  - /integrations/{integration}/{endpoint}
  - WebSocket: wss://api.base44.com/ws

# === GalaGPS API ===
Base URL: ${'{'}GALAGPS_URL{'}'} (sätts via secret)
Auth: Token-based (via username/password)
Rate Limit: Okänd, respekterar 1s delay i kod

Endpoints som används:
  - POST /auth/login
  - GET /devices/list
  - GET /devices/position
  - GET /track/history
  - GET /reports/trips
  - GET /reports/mileage
  - GET /reports/fuel

# === OpenAI API ===
Används VIA Base44 Integrations
Integration: base44.integrations.Core.InvokeLLM
Model: gpt-4o-mini (default i Base44)
Auth: Hanterad av Base44 (ingen egen key behövs)

Användningsområden:
  - AI-klassificering av körjournalsposter
  - Tidrapport-draft generation
  - Projektförslag baserat på historik
  - AI-analys av resemönster

# === OpenStreetMap Nominatim ===
Base URL: https://nominatim.openstreetmap.org
Auth: Ingen (public API)
Rate Limit: 1 request/sekund (implementerad i kod)

Används för:
  - Reverse geocoding (GPS → adress)
  - Används i gpsTracking.js

# === Web Push Protocol ===
VAPID Keys: Auto-genererade av Base44
Public Key: Används i frontend för push subscription
Private Key: Används i backend för att skicka notifikationer

Endpoints:
  - /functions/getVapidPublicKey (hämta public key)
  - /functions/sendWebPushNotification (skicka push)
  
Browser APIs:
  - ServiceWorkerRegistration.pushManager
  - Notification API

# === Leaflet / OpenStreetMap Tiles ===
Tile Server: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
Auth: Ingen (public)
Attribution: © OpenStreetMap contributors

# === Browser APIs (inga externa anrop) ===
  - Geolocation API (navigator.geolocation)
  - Web Bluetooth API (navigator.bluetooth)
  - IndexedDB (lokal cache)
  - LocalStorage (token, preferences)`;

  const secretsGuide = `# ============================================
# GUIDE: HANTERA SECRETS
# ============================================

## Nuvarande Secrets (redan satta):
✅ GALAGPS_USERNAME
✅ GALAGPS_PASSWORD
✅ GALAGPS_URL

## Så här sätter du nya secrets:

1. Gå till Base44 Dashboard
2. Välj ditt projekt
3. Settings → Environment Variables
4. Klicka "Add Secret"
5. Ange namn och värde
6. Spara

## Security Best Practices:

❌ ALDRIG committa secrets till Git
❌ ALDRIG logga secrets i console
❌ ALDRIG skicka secrets till frontend
✅ Använd secrets ENDAST i backend functions
✅ Validera att secret finns innan användning:
   const apiKey = Deno.env.get("SECRET_NAME");
   if (!apiKey) throw new Error("Missing SECRET_NAME");

## Testing lokalt:

Du kan INTE köra Deno functions lokalt utan Base44.
Backend functions måste alltid köras på Base44-plattformen.
Frontend kan köras lokalt med VITE_* variabler.`;

  const packageJson = `{
  "name": "gps-time-tracking",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@base44/sdk": "^0.8.3",
    "@tanstack/react-query": "^5.84.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.26.0",
    "framer-motion": "^11.16.4",
    "react-leaflet": "^4.2.1",
    "lucide-react": "^0.475.0",
    "date-fns": "^3.6.0",
    "moment": "^2.30.1",
    "recharts": "^2.15.4",
    "react-markdown": "^9.0.1",
    "sonner": "^2.0.1",
    "tailwind-merge": "^3.0.2",
    "tailwindcss-animate": "^1.0.7"
  }
}`;

  const entities = [
    { name: 'User', desc: 'Användare med auth (hanterad av Base44)' },
    { name: 'Employee', desc: 'Medarbetarinformation och inställningar' },
    { name: 'Vehicle', desc: 'Fordon med GPS-integration' },
    { name: 'BluetoothDevice', desc: 'Bluetooth-enheter för auto clock-in' },
    { name: 'TimeEntry', desc: 'Tidrapportering med GPS-verifiering' },
    { name: 'WeeklyReport', desc: 'Veckorapporter för attest' },
    { name: 'LeaveRequest', desc: 'Semester och ledighetsansökningar' },
    { name: 'DrivingJournalEntry', desc: 'Körjournalsposter från GPS' },
    { name: 'JournalPolicy', desc: 'Policys för körjournal' },
    { name: 'Geofence', desc: 'Geografiska områden för auto-klassificering' },
    { name: 'FuelLog', desc: 'Tankningsloggar' },
    { name: 'MaintenanceIssue', desc: 'Fel och service på fordon' },
    { name: 'VehicleHandover', desc: 'Fordonöverlämningar' },
    { name: 'Project', desc: 'Projekt för tidrapportering' },
    { name: 'ProjectTask', desc: 'Projektuppgifter' },
    { name: 'WorkPolicy', desc: 'Arbetspolicys och övertidsregler' },
    { name: 'ApprovalRequest', desc: 'Ansökningar och godkännanden' },
    { name: 'Notification', desc: 'Notifikationer till användare' },
    { name: 'Manual', desc: 'Manualer och dokumentation' },
    { name: 'Document', desc: 'Dokument' },
    { name: 'NewsPost', desc: 'Nyheter och inlägg' },
    { name: 'ScheduleEvent', desc: 'Schemalagda händelser' },
    { name: 'OnboardingTemplate', desc: 'Onboarding-mallar' },
    { name: 'OnboardingTask', desc: 'Onboarding-uppgifter' },
    { name: 'Message', desc: 'Chattmeddelanden' },
    { name: 'Conversation', desc: 'Chattkonversationer' },
    { name: 'NotificationSettings', desc: 'Notifikationsinställningar' },
    { name: 'PushSubscription', desc: 'Push-prenumerationer' },
    { name: 'DashboardWidget', desc: 'Dashboard-widgets' },
    { name: 'MileagePolicy', desc: 'Milersättningspolicys' }
  ];

  const functions = [
    { name: 'gpsTracking', desc: 'Proxy till GalaGPS API' },
    { name: 'syncGPSTrips', desc: 'Synkronisera GPS-resor med körjournal' },
    { name: 'bluetoothGPS', desc: 'Bluetooth-integration för auto clock-in' },
    { name: 'analyzeTrips', desc: 'AI-analys av körjournalsposter' },
    { name: 'generateDraftTimeReport', desc: 'AI-genererad tidrapport' },
    { name: 'autoProcessJournal', desc: 'Automatisk klassificering av resor' },
    { name: 'suggestProjects', desc: 'Föreslå projekt baserat på historik' },
    { name: 'sendPushNotification', desc: 'Skicka push-notifikationer' },
    { name: 'autoClockOut', desc: 'Automatisk utcheckning' },
    { name: 'sendTimeReportReminders', desc: 'Påminnelser om tidrapporter' },
    { name: 'exportJournalPDF', desc: 'Exportera körjournal till PDF' },
    { name: 'exportJournalCSV', desc: 'Exportera till CSV' },
    { name: 'generateWeeklyProjectReport', desc: 'Veckrapporter per projekt' }
  ];

  const exportScript = `import { base44 } from '@/api/base44Client';
import fs from 'fs';

const entities = [${entities.map(e => `'${e.name}'`).join(', ')}];

async function exportAll() {
  for (const entityName of entities) {
    const data = await base44.entities[entityName].list();
    fs.writeFileSync(
      \`backup/\${entityName}.json\`,
      JSON.stringify(data, null, 2)
    );
    console.log(\`✓ Exported \${entityName}: \${data.length} records\`);
  }
}

exportAll();`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Exportdokumentation</h1>
          <p className="text-slate-600">All information för att kopiera eller migrera appen</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Översikt</TabsTrigger>
            <TabsTrigger value="env">Miljövariabler</TabsTrigger>
            <TabsTrigger value="database">Databas</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Projektöversikt
                </CardTitle>
                <CardDescription>Komplett GPS & Tidrapporteringssystem</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">🎯 Funktioner</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                    <li>Tidrapportering med GPS-verifiering</li>
                    <li>Real-time GPS-spårning av fordon</li>
                    <li>Automatisk körjournal med AI-klassificering</li>
                    <li>Fordonshantering och underhåll</li>
                    <li>Projekthantering med budget-tracking</li>
                    <li>Medarbetarhantering med onboarding</li>
                    <li>Push-notifikationer</li>
                    <li>Intern chat</li>
                    <li>Geofencing</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🔧 Tech Stack (Fullständig)</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="font-semibold text-sm mb-2">Frontend</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-medium text-slate-700 mb-1">Core:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>React 18.2.0</li>
                            <li>React DOM 18.2.0</li>
                            <li>Vite (build tool)</li>
                            <li>TypeScript (JSX)</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700 mb-1">Routing & State:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>React Router DOM 6.26.0</li>
                            <li>TanStack React Query 5.84.1</li>
                            <li>React Hook Form 7.54.2</li>
                            <li>Zod (validation)</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700 mb-1">UI & Styling:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>TailwindCSS + tailwind-merge</li>
                            <li>shadcn/ui (40+ komponenter)</li>
                            <li>Radix UI primitives</li>
                            <li>Lucide React (icons)</li>
                            <li>Framer Motion 11.16.4</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700 mb-1">Specialized:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>React Leaflet 4.2.1 (maps)</li>
                            <li>Recharts 2.15.4 (charts)</li>
                            <li>React Markdown 9.0.1</li>
                            <li>React Quill 2.0.0 (editor)</li>
                            <li>Three.js 0.171.0 (3D)</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700 mb-1">Utilities:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>date-fns 3.6.0</li>
                            <li>moment 2.30.1</li>
                            <li>lodash 4.17.21</li>
                            <li>jspdf 2.5.2</li>
                            <li>canvas-confetti 1.9.4</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700 mb-1">Notifications:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>Sonner 2.0.1 (toast)</li>
                            <li>React Hot Toast 2.6.0</li>
                            <li>Web Push API</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="font-semibold text-sm mb-2">Backend</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-medium text-slate-700 mb-1">Platform:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>Base44 Platform (BaaS)</li>
                            <li>@base44/sdk 0.8.3</li>
                            <li>Deno Deploy (serverless)</li>
                            <li>PostgreSQL (managed)</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700 mb-1">Features:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>JWT Authentication</li>
                            <li>WebSocket (real-time)</li>
                            <li>File Storage</li>
                            <li>CRUD API (auto-generated)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="font-semibold text-sm mb-2">Integrationer</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-medium text-slate-700 mb-1">GPS & Tracking:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>GalaGPS API</li>
                            <li>OpenStreetMap Nominatim</li>
                            <li>Geolocation API</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700 mb-1">AI & Notifications:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            <li>OpenAI GPT-4</li>
                            <li>Web Push Protocol</li>
                            <li>Service Workers</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-900">
                        <strong>📦 Total bundle size:</strong> ~2.5MB optimerad för produktion med code-splitting
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>📁 Projektstruktur:</strong> All källkod finns i Base44 projektet:
                    entities/ (30 st), pages/ (40+ st), components/ (100+ st), functions/ (40+ st)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="env" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Frontend Miljövariabler
                </CardTitle>
                <CardDescription>Endast för lokal development (npm run dev)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">.env.example (Frontend)</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(frontendEnv, 'Frontend ENV')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied === 'Frontend ENV' ? 'Kopierad!' : 'Kopiera'}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {frontendEnv}
                  </pre>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>ℹ️ Info:</strong> I produktion sätts dessa automatiskt av Base44-plattformen. 
                    Du behöver endast dessa för lokal development av frontend.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Backend Secrets (Deno Functions)
                </CardTitle>
                <CardDescription>Sätt i Base44 Dashboard → Settings → Environment Variables</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">.env (Backend/Functions)</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(backendEnv, 'Backend ENV')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied === 'Backend ENV' ? 'Kopierad!' : 'Kopiera'}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {backendEnv}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-green-900 mb-2">✅ Redan satta:</p>
                    <ul className="text-xs space-y-1 text-green-800">
                      <li>• GALAGPS_USERNAME</li>
                      <li>• GALAGPS_PASSWORD</li>
                      <li>• GALAGPS_URL</li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-slate-900 mb-2">🤖 Auto-hanterade:</p>
                    <ul className="text-xs space-y-1 text-slate-600">
                      <li>• BASE44_APP_ID</li>
                      <li>• VAPID_PUBLIC_KEY</li>
                      <li>• VAPID_PRIVATE_KEY</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-sm text-amber-900">
                    <strong>⚠️ Viktigt:</strong> Backend functions kan INTE köras lokalt. 
                    De körs alltid på Base44 Deno Deploy. Secrets nås via Deno.env.get().
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Externa API Endpoints
                </CardTitle>
                <CardDescription>Alla externa beroenden och endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">API Endpoints & Integration</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(externalEndpoints, 'Endpoints')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied === 'Endpoints' ? 'Kopierad!' : 'Kopiera'}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
                    {externalEndpoints}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔐 Secrets Management Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Hantera Secrets säkert</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(secretsGuide, 'Secrets Guide')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied === 'Secrets Guide' ? 'Kopierad!' : 'Kopiera'}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {secretsGuide}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Databasschema
                </CardTitle>
                <CardDescription>{entities.length} entiteter definierade i entities/ mappen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {entities.map((entity) => (
                    <div key={entity.name} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Database className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{entity.name}.json</p>
                        <p className="text-xs text-slate-600">{entity.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>🔍 Schema:</strong> Alla entiteter finns i entities/*.json som JSON Schema.
                    Varje entitet får automatiskt id, created_date, updated_date, created_by.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Dependencies
                </CardTitle>
                <CardDescription>NPM packages som används</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">package.json</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(packageJson, 'package.json')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied === 'package.json' ? 'Kopierad!' : 'Kopiera'}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {packageJson}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="font-semibold text-sm mb-2">Huvudbibliotek</p>
                    <ul className="text-xs space-y-1 text-slate-600">
                      <li>• @base44/sdk</li>
                      <li>• react + react-dom</li>
                      <li>• @tanstack/react-query</li>
                      <li>• react-router-dom</li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="font-semibold text-sm mb-2">UI & Maps</p>
                    <ul className="text-xs space-y-1 text-slate-600">
                      <li>• shadcn/ui (40+ komponenter)</li>
                      <li>• lucide-react (icons)</li>
                      <li>• react-leaflet (maps)</li>
                      <li>• framer-motion</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Backend Functions
                </CardTitle>
                <CardDescription>{functions.length} Deno Deploy functions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {functions.map((func) => (
                    <div key={func.name} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                      <Code className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{func.name}.js</p>
                        <p className="text-xs text-slate-600">{func.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Export
                </CardTitle>
                <CardDescription>Exportera all data från databasen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Export Script (Node.js)</h3>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-600">Kör för att exportera all data till JSON</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(exportScript, 'Export Script')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied === 'Export Script' ? 'Kopierad!' : 'Kopiera'}
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {exportScript}
                  </pre>
                </div>

                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2">🔄 Steg för steg:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                      <li>Skapa export-script lokalt (export.js)</li>
                      <li>Kör: <code className="bg-blue-100 px-1 rounded">node export.js</code></li>
                      <li>Data sparas i backup/*.json</li>
                      <li>Versionshantera med Git</li>
                    </ol>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Manual export via browser:</p>
                    <p className="text-sm text-amber-800 mb-2">Öppna browser console och kör:</p>
                    <pre className="bg-amber-100 text-amber-900 p-2 rounded text-xs overflow-x-auto">
{`const data = await base44.entities.Employee.list();
console.log(JSON.stringify(data, null, 2));`}
                    </pre>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-900">
                    <strong>✅ Vad exporteras:</strong> All data från alla {entities.length} entiteter inklusive
                    metadata (id, created_date, updated_date, created_by).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📋 Checklista för export</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Alla entities/*.json kopierade
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Alla pages/*.js kopierade
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Alla components/*.jsx kopierade
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Alla functions/*.js kopierade
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Layout.js kopierad
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Miljövariabler dokumenterade
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Data exporterad från databasen
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    Dependencies listade (package.json)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    README/instruktioner skapade
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">📚 Fullständig dokumentation</h3>
                <p className="text-sm text-slate-300 mb-3">
                  All källkod, schema och konfiguration finns i Base44-projektet. För migration till egen infrastruktur, 
                  se dokumentation om att portera till Node.js/Python med egen databas.
                </p>
                <p className="text-xs text-slate-400">
                  Estimerad migrationstid: 6-8 veckor fullstack-arbete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}