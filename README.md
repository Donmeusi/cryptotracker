# CryptoTracker

> **Dein privater, selbst-gehosteter Krypto-Portfolio-Manager** — Open-Source, datenschutzorientiert, ohne Cloud-Abhängigkeit.

Ein modernes Full-Stack-Dashboard zum Verwalten von Krypto-Assets, On-Chain Wallets, NFTs, Trades und Steuerereignissen. Gebaut mit Next.js 15, Prisma ORM, NextAuth.js v5 und Recharts — mit einem hochwertigen Dark/Light-Mode-UI und Live-Preisen.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 📊 **Dashboard** | Aggregiertes Gesamtvermögen, Live-Auto-Sync (15s), Echtzeit-Preise mit Flash-Animationen |
| 🎨 **Asset-Verteilung** | Donut-Chart mit Krypto-Branding (BTC, ETH, SOL, ADA), Donut-Center Badge & Proportionalbalken |
| 🔗 **On-Chain Wallet Scanner** | Automatischer Balance-Scan für Ethereum (`0x...`), Bitcoin (`bc1...`), Solana & Polygon Adressen |
| 📄 **PDF Trade-Import** | Parser zur automatischen Extraktion von Kauf/Verkauf-Transaktionen aus PDF-Kontoauszügen |
| 📱 **Mobile Responsiv** | Vollständige Responsivität (keine horizontale Laufleiste) mit mobilem Side-Drawer Navigation |
| 💼 **Assets Tracker** | CRUD für alle Krypto-Positionen, Live-Preise, PnL pro Asset |
| 🖼️ **NFT Manager** | Manuelle NFT-Erfassung mit Floor-Preis und Collection-Tracking |
| 📈 **Trade-Historie** | Vollständige Transaktionsübersicht mit Filter, PDF-Import, Edit & Delete |
| 🧮 **Steuerlogik (§ 23 EStG)** | FIFO / LIFO / HIFO Berechnung, Haltedauer-Kennzeichnung (> 365 Tage steuerfrei), PDF + CSV Export |
| 🏛️ **Börsen-Anbindung** | API-Key Verwaltung für Binance, Kraken, Coinbase, OKX, Bybit |
| 🎨 **Themes & Personalisierung** | 4 Themes (Dark, Midnight, Light, Forest) + 5 Akzentfarben, dynamisches `color-scheme` |

---

## 🛠️ Tech Stack

| Schicht | Technologie |
|---------|------------|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Turbopack) |
| **Datenbank** | [Prisma ORM](https://www.prisma.io/) + SQLite (lokal) / PostgreSQL (Prod) |
| **Auth** | [NextAuth.js v5 Beta](https://authjs.dev/) — Credentials Provider |
| **Charts** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Sprache** | TypeScript 5 — vollständig typisiert |
| **Linting & Audit** | ESLint v9 (Flat Config), Antigravity Master Checklist |

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
```

### 4. Entwicklungsserver starten

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
| `npm run db:push` | Schema direkt in DB schreiben |
| `npm run db:generate` | Prisma Client neu generieren |

---

## 📄 Lizenz

Dieses Projekt ist unter der **[MIT-Lizenz](LICENSE)** lizenziert.
