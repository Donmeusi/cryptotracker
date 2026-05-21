# CryptoTracker

> **Dein privater, selbst-gehosteter Krypto-Portfolio-Manager** — Open-Source, datenschutzorientiert, ohne Cloud-Abhängigkeit.

Ein modernes Full-Stack-Dashboard zum Verwalten von Krypto-Assets, NFTs, Trades und Steuerereignissen. Gebaut mit Next.js 15, Prisma ORM und NextAuth.js v5 — mit einem hochwertigen Dark-Mode-UI und Live-Preisen via CoinGecko.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 📊 **Dashboard** | Aggregiertes Portfolio-Wert, G&V-Trend, Asset-Allokation (Donut-Chart) |
| 💼 **Assets Tracker** | CRUD für alle Krypto-Positionen, Live-Preise, PnL pro Asset |
| 🖼️ **NFT Manager** | Manuelle NFT-Erfassung mit Floor-Preis und Collection-Tracking |
| 📈 **Trade-Historie** | Vollständige Transaktionsübersicht mit Filter, Edit & Delete |
| 🧮 **Steuerlogik** | FIFO / LIFO / HIFO Berechnung, langfristig vs. kurzfristig, PDF + CSV Export |
| 🏛️ **Börsen-Anbindung** | API-Key Verwaltung für Binance, Kraken, Coinbase, OKX, Bybit |
| 📧 **E-Mail Benachrichtigungen** | SMTP-Konfiguration direkt in den Einstellungen (kein .env nötig) |
| 🎨 **Themes & Personalisierung** | 4 Themes (Dark, Midnight, Light, Forest) + 5 Akzentfarben, Schriftgröße |
| 💹 **Live-Preise** | CoinGecko API mit serverseitigem Caching und Fallback auf Mock-Daten |

---

## 🛠️ Tech Stack

| Schicht | Technologie |
|---------|------------|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Turbopack) |
| **Datenbank** | [Prisma ORM](https://www.prisma.io/) + SQLite (lokal) / PostgreSQL (Prod) |
| **Auth** | [NextAuth.js v5 Beta](https://authjs.dev/) — Credentials Provider |
| **Charts** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **State** | [Zustand](https://github.com/pmndrs/zustand) |
| **Sprache** | TypeScript 5 — vollständig typisiert, 0 `any` Typen |
| **Linting** | ESLint v9 (Flat Config) — 0 Errors, 0 Warnings |

---

## 🚀 Quickstart

### 1. Repository klonen

```bash
git clone https://github.com/Donmeusi/cryptotracker.git
cd cryptotracker
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
# Datenbank (SQLite lokal)
DATABASE_URL="file:./prisma/cryptotracker.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dein-geheimes-secret-hier"

# Optional: CoinGecko API Key (für höhere Rate Limits)
# COINGECKO_API_KEY="dein-api-key"
```

### 4. Datenbank initialisieren

```bash
npm run db:push       # Schema in die DB schreiben
npm run db:generate   # Prisma Client generieren
npm run db:seed       # Testdaten einspielen (optional)
```

### 5. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft unter [http://localhost:3000](http://localhost:3000) 🎉

---

## 📦 Verfügbare Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run dev` | Entwicklungsserver mit Turbopack |
| `npm run build` | Produktions-Build |
| `npm run start` | Produktionsserver starten |
| `npm run db:push` | Schema direkt in DB schreiben (kein Migrations-Log) |
| `npm run db:migrate` | Migration mit Versionshistorie ausführen |
| `npm run db:generate` | Prisma Client neu generieren |
| `npm run db:studio` | Visuellen DB-Browser öffnen |
| `npm run db:seed` | Testdaten einspielen |

---

## 🗄️ Datenbank-Schema

```
User ──< NotificationSettings
User ──< Trade
User ──< Asset (Holdings)
User ──< NFT
User ──< DeFiPosition
User ──< PriceAlert
```

**Migration zu PostgreSQL** (für Produktion):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/cryptotracker"
```
Danach: `npx prisma migrate deploy`

---

## 🏗️ Projektstruktur

```
cryptotracker/
├── app/
│   ├── (auth)/              # Login, Registrierung
│   ├── (dashboard)/         # Dashboard, Assets, Trades, NFTs, Steuern, Börsen, Einstellungen
│   ├── api/                 # API Routes (Auth, Tax, Notifications, Live-Preise)
│   ├── globals.css          # Design System (CSS Variables, Tokens)
│   └── layout.tsx           # Root Layout mit Theme-Restore
├── components/
│   └── dashboard/           # PortfolioChart, AllocationChart, Providers
├── lib/
│   ├── auth.ts              # NextAuth Konfiguration
│   ├── db.ts                # Prisma Client
│   ├── livePrices.ts        # CoinGecko Integration
│   ├── exportUtils.ts       # PDF & CSV Export (Blob-basiert, XSS-safe)
│   ├── tax/                 # FIFO / LIFO / HIFO Steuerberechnung
│   ├── hooks/               # useLivePrices Hook
│   └── mock/                # Demo-Daten für alle Module
├── prisma/
│   └── schema.prisma        # Datenbankschema
├── eslint.config.mjs        # ESLint v9 Flat Config
└── middleware.ts            # Route Protection
```

---

## 🔒 Sicherheit & Code-Qualität

- ✅ **0 ESLint Errors** — ESLint v9 Flat Config mit Next.js + TypeScript Regeln
- ✅ **0 TypeScript Fehler** — Vollständig typisiert, keine `any` Typen im App-Code
- ✅ **XSS-sicher** — `document.write()` durch Blob URL ersetzt; `dangerouslySetInnerHTML` nur für statischen Theme-Restore-Script
- ✅ **`prefers-reduced-motion`** — Animationen respektieren Barrierefreiheits-Einstellungen
- ✅ **Security Headers** — Konfiguriert in `next.config.ts`
- ✅ **Purple Ban** — Alle Farben im Design-System folgen dem Teal/Cyan/Emerald-Farbschema

---

## 🗺️ Roadmap

- [ ] PostgreSQL-Migration für Produktions-Deployment
- [ ] Echte Exchange-API-Anbindung (Binance, Kraken via CCXT)
- [ ] Preisalarme mit echtem Cron-Job
- [ ] Mobile-responsive Optimierung (PWA)
- [ ] Dark/Light Theme System-Auto-Detect beim ersten Start

---

## 📜 Lizenz

Proprietäres Projekt — alle Rechte vorbehalten.

---

<div align="center">
  <sub>Gebaut mit ❤️ und Next.js 15 · TypeScript · Prisma</sub>
</div>
