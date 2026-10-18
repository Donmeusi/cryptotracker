# CryptoTracker

> **Dein privater, selbst-gehosteter Krypto-Portfolio-Manager** — Open-Source, datenschutzorientiert, ohne Cloud-Abhängigkeit.

Ein modernes Full-Stack-Dashboard zum Verwalten von Krypto-Assets, On-Chain Wallets, NFTs, Trades und Steuerereignissen. Gebaut mit Next.js 15, Prisma ORM, NextAuth.js v5 und Recharts — mit einem hochwertigen Dark/Light-Mode-UI, Docker-Unterstützung und Live-Preisen.

> **Projektstatus (Oktober 2026): UI-Prototyp mit funktionierender Anmeldung.**
> Authentifizierung, OIDC, PDF-Import, Live-Preise, Benachrichtigungen und die
> Steuerberechnung laufen. Die Portfolio-Seiten (Dashboard, Assets, DeFi, NFTs,
> Trades, Börsen) zeigen jedoch **Demodaten aus `lib/mock/data.ts`** und schreiben
> nicht in die Datenbank. Das Prisma-Schema ist vollständig angelegt, die
> CRUD-Anbindung fehlt noch. Eine frische Installation zeigt deshalb
> Beispielvermögen statt eines leeren Depots. Der Wallet-Scan ist simuliert.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 📊 **Dashboard** | Aggregiertes Gesamtvermögen, Live-Auto-Sync (15s), Echtzeit-Preise mit Flash-Animationen |
| 🎨 **Asset-Verteilung** | Donut-Chart mit Krypto-Branding (BTC, ETH, SOL, ADA), Donut-Center Badge & Proportionalbalken |
| 🔗 **On-Chain Wallet Scanner** | **Simuliert:** prüft das Adressformat und liefert Zufallsbestände, fragt keine Chain-API ab |
| 📄 **PDF Trade-Import** | Parser zur automatischen Extraktion von Kauf/Verkauf-Transaktionen aus PDF-Kontoauszügen |
| 📱 **Mobile Responsiv** | Vollständige Responsivität (keine horizontale Laufleiste) mit mobilem Side-Drawer Navigation |
| 🐳 **Docker Ready** | Optimiertes Multi-Stage Dockerfile (`output: "standalone"`) & Docker Compose Setup |
| 💼 **Assets Tracker** | Ansicht mit Demodaten; Bearbeitungen bleiben nur im Browser (CRUD nicht persistiert) |
| 🖼️ **NFT Manager** | Ansicht mit Demodaten |
| 📈 **Trade-Historie** | Ansicht mit Demodaten; der PDF-Import liefert echte Transaktionen |
| 🔑 **OIDC / SSO Integration** | Universal OpenID Connect Support (Pocket-ID, Keycloak, Authentik, Authelia, Zitadel) mit UI-basierter Verwaltung |
| 🗄️ **Externe Datenbank (UI)** | PostgreSQL, MySQL / MariaDB & SQLite direkt über die Benutzeroberfläche verbinden mit Verbindungstest & Schema-Sync |
| 🔄 **System & Updates** | Branch-Wechsel und 1-Klick-Update aus der UI; funktioniert nur in einer Installation mit git/npm, **nicht im Container** |
| 🧮 **Steuerlogik (§ 23 EStG)** | FIFO / LIFO / HIFO Berechnung, Hover-Erklärungs-Tooltips, Haltedauer (> 365 Tage steuerfrei), PDF + CSV Export — rechnet derzeit auf Demodaten |
| 🎛️ **Modul-Steuerung** | Flexibles Ein- & Ausblenden von Bereichen (DeFi, NFTs) in der Seitenleiste über Einstellungen |
| 🏛️ **Börsen-Anbindung** | API-Key-Eingabe im Demo-Modus; Schlüssel werden nicht serverseitig gespeichert |
| 🎨 **Themes & Personalisierung** | 4 Themes (Dark, Midnight, Light, Forest) + 5 Akzentfarben, dynamisches `color-scheme` |

---

## 🐳 Installation mit Docker & Docker Compose

### Schnellstart mit Docker Compose (Empfohlen)

1. Repository klonen:
   ```bash
   git clone https://github.com/Donmeusi/cryptotracker.git
   cd cryptotracker
   ```

2. Konfiguration anlegen:
   ```bash
   cp .env.example .env
   # AUTH_SECRET setzen:
   openssl rand -base64 32
   # Wert in .env eintragen
   ```

3. Container bauen und im Hintergrund starten:
   ```bash
   docker compose up -d --build
   ```

4. Die App ist direkt erreichbar unter:
   [http://localhost:3000](http://localhost:3000) 🎉

---

### Manuelle Installation mit Docker CLI

1. Docker-Image bauen:
   ```bash
   docker build -t cryptotracker:latest .
   ```

2. Container ausführen:
   ```bash
   docker run -d \
     --name cryptotracker \
     -p 3000:3000 \
     -e AUTH_URL=http://localhost:3000 \
     -e AUTH_SECRET="$(openssl rand -base64 32)" \
     -e DATABASE_URL=file:/data/cryptotracker.db \
     -v cryptotracker_data:/data \
     cryptotracker:latest
   ```

---

## 🛠️ Tech Stack & Architektur

| Schicht | Technologie |
|---------|------------|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Turbopack, Standalone Output) |
| **Container** | [Docker](https://www.docker.com/) & Docker Compose (Multi-Stage Node 22 Alpine) |
| **Datenbank** | [Prisma ORM](https://www.prisma.io/) + SQLite / PostgreSQL |
| **Auth** | [NextAuth.js v5 Beta](https://authjs.dev/) — Credentials Provider |
| **Charts** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Sprache** | TypeScript 5 — vollständig typisiert |

---

## 🚀 Lokale Installation (ohne Docker)

### 1. Abhängigkeiten installieren & starten

```bash
git clone https://github.com/Donmeusi/cryptotracker.git
cd cryptotracker
npm install
npm run dev
```

---

## 📦 Verfügbare Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run dev` | Entwicklungsserver mit Turbopack |
| `npm run build` | Produktions-Build (Standalone Mode) |
| `npm run start` | Produktionsserver starten |
| `npm run db:push` | Schema direkt in DB schreiben |
| `npm run db:generate` | Prisma Client neu generieren |

---

## 📚 Dokumentation, Wiki & DSGVO / TOM

* 📖 **[GitHub Wiki](https://github.com/Donmeusi/cryptotracker/wiki):** Vollständige Anleitungen zu Installation, OIDC, Datenbanken, Updates & Steuern.
* 🛡️ **[Technische Systemdokumentation & TOM (Art. 32 DSGVO)](docs/SYSTEMDOKUMENTATION_UND_TOM.md):** Ausführliche Systemdokumentation und Technisch-Organisatorische Maßnahmen zur Datensicherheit gemäß Art. 32 DSGVO.

---

## 📄 Lizenz

Dieses Projekt ist unter der **[MIT-Lizenz](LICENSE)** lizenziert.
