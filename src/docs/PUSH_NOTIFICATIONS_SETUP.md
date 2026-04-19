# Push-notifikationer via Web Push API

Denna implementering aktiverar fullständiga push-notifikationer för IM Workspace med samma arkitektur som CRM- och Lager AI-apparna.

## 🔧 Systemkomponenter

### 1. Service Worker (`/public/sw.js`)
Hanterar `push`-events och visar notiseringar. Stödjer klick-åtgärder som öppnar rätt sida baserat på `data.action_url`.

### 2. Web App Manifest (`/public/manifest.json`)
Definierar PWA-konfiguration:
- `name`: "IM Workspace"
- `display`: "standalone" (mobil-app-läge)
- `start_url`: "/"
- `theme_color`, `background_color`
- Icons för 192x192 och 512x512 (+ maskable)

### 3. Frontend-komponenter

#### `PushNotificationSetup.jsx`
- Knapp för att aktivera/inaktivera push
- Begär Notification.permission
- Registrerar PushManager.subscribe() med VAPID-nyckel
- Sparar subscription i PushSubscription-entiteten
- Hanterar iOS-specifika begränsningar (kräver hemskärmsinstallation)

#### `PushTestButton.jsx`
- Admin-knapp för att skicka test-push till sig själv
- Verifierar att flödet fungerar

#### `ServiceWorkerManager.jsx`
- Automatisk registrering av Service Worker på app-start

### 4. Backend-funktioner

#### `getVapidPublicKey.js`
- Exponerar VAPID public key till frontend
- Endast för autentiserade användare

#### `sendPushNotification.js`
- Tar emot: `recipient_email, title, message, action_url?, type, priority, related_entity_id?, related_entity_type?`
- Hämtar aktiva PushSubscription för mottagaren
- Skickar via web-push-biblioteket
- Deaktiverar endpoints som returnerar 410/404
- Skapar Notification-post i databasen

#### Automations-funktioner
- `onApprovalRequestCreated.js` → Push till chef när godkännandebegäran skapas
- `onLeaveRequestStatusChange.js` → Push till medarbetare när semester godkänns/avslås
- `onTimeEntryAnomaly.js` → Push när tidsavvikelse detekteras
- `onMessageCreated.js` → Push när ny chatt-meddelande anländer

### 5. Miljövariabler (VAPID-nycklar)

VAPID-nycklar krävs för web-push. Dessa måste skapas via:
```bash
npm install web-push -g
web-push generate-vapid-keys
```

Sätt i environment variables:
- `VAPID_PUBLIC_KEY` (exponeras till frontend)
- `VAPID_PRIVATE_KEY` (endast backend)

## 📱 Användare - Aktivera Push

1. Gå till **Profil** → **Push-notifikationer**
2. Klicka **"Aktivera notiser"**
3. Godkänn Notification.permission i webbläsaren
4. Service Worker registreras automatiskt
5. Subscription sparas i databasen

### iOS-specifikt
Push via PWA på iOS 16.4+ kräver hemskärmsinstallation:
1. Öppna appen i Safari
2. Klicka **Dela** → **Lägg till på hemskärmen**
3. Installerad app → Push aktiveras automatiskt

## ⚙️ Admin - Testa Push

1. Gå till **Admin** → **Inställningar** → **Push-test**
2. Klicka **"Skicka test-push"**
3. Bör få notifikation inom 2-3 sekunder
4. Klick på notis öppnar appen på rätt sida

## 🔌 Automations-setup (manuell)

För att aktivera push-notifikationer på händelser, skapa följande automations via dashboard eller API:

### ApprovalRequest skapas → Push till chef
```
automation_type: entity
entity_name: ApprovalRequest
event_types: ["create"]
function_name: onApprovalRequestCreated
```

### LeaveRequest godkänd/avslagen → Push till medarbetare
```
automation_type: entity
entity_name: LeaveRequest
event_types: ["update"]
function_name: onLeaveRequestStatusChange
trigger_conditions: {
  conditions: [
    { field: "changed_fields", operator: "contains", value: "status" }
  ]
}
```

### TimeEntry anomali → Push till medarbetare
```
automation_type: entity
entity_name: TimeEntry
event_types: ["update"]
function_name: onTimeEntryAnomaly
trigger_conditions: {
  conditions: [
    { field: "changed_fields", operator: "contains", value: "anomaly_flag" }
  ]
}
```

### Message skapas → Push till mottagare
```
automation_type: entity
entity_name: Message
event_types: ["create"]
function_name: onMessageCreated
```

## 📊 Dataflöde

1. **Användare aktiverar push** → Subscription sparas i PushSubscription
2. **Händelse inträffar** (ApprovalRequest skapas, etc.)
3. **Automation triggas** → backend-funktion anropas
4. **Backend-funktion** → `sendPushNotification` med detaljer
5. **sendPushNotification** → Hämtar endpoints från PushSubscription
6. **web-push** → Skickar till push-service (FCM, APNS, etc.)
7. **Browser/device** → Visar notifikation
8. **Klick på notis** → Service Worker öppnar rätt URL

## 🔒 Säkerhet

- VAPID private key lagras endast i backend-miljövariabel
- Public key exponeras till frontend för subscription
- Endast auth-användare kan aktivera push
- Push från sendPushNotification kräver autentisering eller admin-roll
- Endpoints valideras och deaktiveras om de är utgångna

## 📝 Notifikationstyper

Tillgängliga notification types:
- `approval_needed` - Godkännandebegäran
- `approved` - Godkännd
- `rejected` - Avslagen
- `time_correction_needed` - Tidskorrigering behövs
- `forgot_clock_out` - Glömt att stämpla ut
- `overtime_warning` - Övertidsvarning
- `message` - Nytt chatt-meddelande
- `system` - Systemnotifikation
- `vacation_reminder` - Semesterspecial
- `news` - Nyheetsuppdatering
- `onboarding` - Onboarding-task tilldelad
- `maintenance` - Fordonsunderhål

## 🧪 Testa Integrationen

1. Aktivera push i Profil
2. Gå till Admin → Push-test
3. Skicka test-push
4. Verifiera att notis visas på enheten
5. Klicka notis → navigerar till rätt sida

## 🐛 Troubleshooting

### Inga push-notifikationer?
- [ ] Service Worker registrerad (kontrollera DevTools → Application → Service Workers)
- [ ] PushSubscription skapades (check database)
- [ ] Notification.permission = "granted" (kontrollera webbläsare-inställningar)
- [ ] VAPID_PUBLIC_KEY och VAPID_PRIVATE_KEY är satta

### iOS: Push funkar inte
- [ ] Appen måste vara installerad på hemskärmen
- [ ] iOS 16.4+ krävs
- [ ] Notification permission måste vara granted

### Endpoint 410/404?
- Automatis deaktiverad av sendPushNotification
- Användaren kan enkelt re-aktivera genom att gå till Profil

## 📚 Referens

- [Web Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push npm](https://www.npmjs.com/package/web-push)
- [PWA iOS](https://developer.apple.com/business/news/supporting-web-apps-in-ios-and-ipados/)