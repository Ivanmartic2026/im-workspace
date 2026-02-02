# Personalhantering

En modern React-applikation för personalhantering, tidrapportering, fordonsflotta och körjournal.

## Funktioner

- **Tidrapportering** - Stämpla in/ut, projektallokering, flex-tid
- **Fordonshantering** - Inventering, GPS-spårning, underhåll
- **Körjournal** - Automatisk resloggning, rapporter
- **Personalhantering** - Anställda, team, onboarding
- **Ledighetshantering** - Ansökningar och godkännanden
- **Kommunikation** - Chatt, nyhetsflöde, notiser

## Kom igång

### 1. Installera beroenden

```bash
npm install
```

### 2. Starta utvecklingsservern

```bash
npm run dev
```

Appen körs nu på `http://localhost:5173` med mock-data.

### 3. Bygg för produktion

```bash
npm run build
```

## Konfiguration

### Miljövariabler (.env)

```env
# API Mode: 'mock' för lokal utveckling, 'supabase' för produktion
VITE_API_MODE=mock

# Supabase (för produktion)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

### Alternativ 1: Vercel (Rekommenderat)

1. Skapa konto på [vercel.com](https://vercel.com)
2. Anslut ditt GitHub-repo
3. Lägg till miljövariabler i Vercel Dashboard
4. Deploy!

```bash
# Eller via CLI
npm i -g vercel
vercel
```

### Alternativ 2: Netlify

1. Skapa konto på [netlify.com](https://netlify.com)
2. Dra och släpp `dist/` mappen efter `npm run build`
3. Eller anslut GitHub-repo för automatisk deploy

### Alternativ 3: Egen server

```bash
npm run build
# Servera dist/ mappen med valfri webbserver (nginx, apache, etc.)
```

## Sätta upp Supabase (Produktion)

1. Skapa projekt på [supabase.com](https://supabase.com)

2. Kör databasschema:
   - Gå till SQL Editor i Supabase Dashboard
   - Klistra in innehållet från `supabase/schema.sql`
   - Kör scriptet

3. Konfigurera autentisering:
   - Gå till Authentication > Providers
   - Aktivera Email/Password

4. Uppdatera `.env`:
   ```env
   VITE_API_MODE=supabase
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxx
   ```

5. Installera Supabase-klient:
   ```bash
   npm install @supabase/supabase-js
   ```

## Projektstruktur

```
src/
├── api/                 # API-klient och mock-data
│   ├── client.js        # Huvudsaklig API-klient
│   ├── mockData.js      # Mock-data för utveckling
│   └── supabaseClient.js # Supabase-integration
├── components/          # React-komponenter
│   ├── admin/           # Admin-komponenter
│   ├── employees/       # Personalkomponenter
│   ├── time/            # Tidrapportering
│   ├── vehicles/        # Fordonshantering
│   └── ui/              # Bas UI-komponenter
├── pages/               # Sidkomponenter
├── lib/                 # Utilities och context
└── hooks/               # Custom React hooks
```

## Teknisk stack

- **React 18** - UI-ramverk
- **Vite** - Byggsystem
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI-komponenter
- **React Query** - Server state
- **React Router** - Routing
- **Framer Motion** - Animationer

## Utveckling

### Linting

```bash
npm run lint        # Visa fel
npm run lint:fix    # Fixa automatiskt
```

### Type checking

```bash
npm run typecheck
```

## Licens

MIT
