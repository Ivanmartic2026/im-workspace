# Home Assistant - Installation på Raspberry Pi 4

## Vad du behöver

- Raspberry Pi 4 (rekommenderat: 4 GB RAM eller mer)
- microSD-kort (minst 32 GB, klass A2 rekommenderas)
- USB-C strömadapter (minst 3A)
- Ethernet-kabel (rekommenderas) eller WiFi
- Dator med SD-kortläsare

---

## Steg 1: Ladda ner och installera Home Assistant OS

### 1.1 Ladda ner Raspberry Pi Imager

Ladda ner och installera **Raspberry Pi Imager** från:
https://www.raspberrypi.com/software/

### 1.2 Flasha Home Assistant OS

1. Öppna Raspberry Pi Imager
2. Klicka **"Choose Device"** → välj **Raspberry Pi 4**
3. Klicka **"Choose OS"** → **Other specific-purpose OS** → **Home assistants and home automation** → **Home Assistant** → **Home Assistant OS (RPi 4/400)**
4. Klicka **"Choose Storage"** → välj ditt microSD-kort
5. Klicka **"Next"** och bekräfta

> **OBS:** Om du vill använda WiFi istället för Ethernet, se steg 1.3 nedan.

### 1.3 WiFi-konfiguration (valfritt)

Om du inte använder Ethernet-kabel:

1. När SD-kortet är flashat, ta inte ut det
2. Öppna partitionen `hassos-boot` på SD-kortet
3. Skapa en mapp som heter `CONFIG/network/`
4. Skapa filen `my-network` i den mappen med följande innehåll:

```ini
[connection]
id=my-network
uuid=<generera med uuidgen>
type=802-11-wireless

[802-11-wireless]
mode=infrastructure
ssid=DITT_WIFI_NAMN

[802-11-wireless-security]
auth-alg=open
key-mgmt=wpa-psk
psk=DITT_WIFI_LÖSENORD

[ipv4]
method=auto

[ipv6]
addr-gen-mode=stable-privacy
method=auto
```

---

## Steg 2: Starta Raspberry Pi

1. Sätt i microSD-kortet i din Raspberry Pi 4
2. Anslut Ethernet-kabel (om du använder kabelanslutet nätverk)
3. Anslut strömadaptern

> **Första uppstarten tar ca 5-20 minuter.** Ha tålamod — systemet laddar ner och installerar nödvändiga komponenter.

---

## Steg 3: Anslut till Home Assistant

1. Öppna en webbläsare på din dator (som är på samma nätverk)
2. Gå till: **http://homeassistant.local:8123**

> Om det inte fungerar, prova din Pi:s IP-adress: `http://<PI_IP>:8123`
>
> Tips: Hitta IP-adressen via din routers admin-sida eller kör `nmap -sn 192.168.1.0/24` från en dator på nätverket.

3. Vänta tills meddelandet "Preparing Home Assistant" försvinner
4. Klicka **"Create my smart home"**
5. Skapa ditt användarkonto (namn, användarnamn, lösenord)
6. Ställ in din plats (för väder, soluppgång etc.)
7. Välj vilka enheter du vill dela data med (eller hoppa över)

---

## Steg 4: Grundkonfiguration

### 4.1 Uppdatera systemet

1. Gå till **Settings** → **System** → **Updates**
2. Installera alla tillgängliga uppdateringar
3. Starta om om det krävs

### 4.2 Installera HACS (Home Assistant Community Store)

HACS ger dig tillgång till tusentals community-integrationer och teman.

1. Gå till **Settings** → **Add-ons** → **Add-on Store**
2. Klicka på menyn (⋮) → **Repositories**
3. Alternativt, installera via terminal:

```bash
wget -O - https://get.hacs.xyz | bash -
```

4. Starta om Home Assistant
5. Gå till **Settings** → **Devices & Services** → **Add Integration** → sök "HACS"

### 4.3 Rekommenderade tillägg (Add-ons)

Gå till **Settings** → **Add-ons** → **Add-on Store** och installera:

| Tillägg | Beskrivning |
|---------|-------------|
| **File Editor** | Redigera config-filer direkt i webbläsaren |
| **Terminal & SSH** | SSH-åtkomst till din Pi |
| **Samba Share** | Dela filer via nätverket |
| **Mosquitto MQTT** | MQTT-broker för IoT-enheter |

---

## Steg 5: Lägg till enheter

### Automatisk upptäckt

Home Assistant upptäcker ofta enheter automatiskt. Kolla:
**Settings** → **Devices & Services** → **Discovered**

### Populära integrationer

| Integration | Typ |
|------------|-----|
| **Philips Hue** | Smarta lampor |
| **IKEA TRÅDFRI** | Smarta lampor & tillbehör |
| **Google Cast** | Chromecast, Google Home |
| **Spotify** | Musikstreaming |
| **Zigbee (ZHA)** | Zigbee-enheter (kräver USB-dongle) |
| **Z-Wave** | Z-Wave-enheter (kräver USB-dongle) |
| **Shelly** | WiFi-reläer och sensorer |

---

## Steg 6: Säkerhetskopior

**Viktigt!** Sätt upp automatiska säkerhetskopior:

1. Gå till **Settings** → **System** → **Backups**
2. Klicka **"Create Backup"** för en manuell kopia
3. Installera tillägget **Google Drive Backup** för automatiska kopior till molnet

---

## Felsökning

| Problem | Lösning |
|---------|---------|
| Kan inte nå `homeassistant.local:8123` | Vänta 20 min, prova IP-adressen istället |
| Trög prestanda | Använd ett snabbt A2 microSD-kort eller byt till USB SSD |
| WiFi kopplar ifrån | Använd Ethernet för stabilare anslutning |
| Enheter hittas inte | Kontrollera att de är på samma nätverk/subnät |
| Röd LED blinkar på Pi | Strömadaptern ger inte tillräckligt med ström (behöver 3A+) |

### Flytta till USB SSD (rekommenderas)

För bättre prestanda och längre livslängd:

1. Installera **Home Assistant OS** på en USB SSD istället för microSD
2. Använd samma process i Raspberry Pi Imager men välj SSD som destination
3. Se till att din Pi 4 har uppdaterad bootloader (för USB-boot)

---

## Användbara länkar

- Home Assistant dokumentation: https://www.home-assistant.io/docs/
- Community forum: https://community.home-assistant.io/
- Home Assistant på Discord: https://www.home-assistant.io/join-chat/
