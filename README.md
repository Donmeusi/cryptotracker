# CryptoTracker

> **Dein privater, selbst-gehosteter Krypto-Portfolio-Manager** — Open-Source, datenschutzorientiert, ohne Cloud-Abhängigkeit.

Ein modernes Full-Stack-Dashboard zum Verwalten von Krypto-Assets, On-Chain Wallets, NFTs, Trades und Steuerereignissen. Gebaut mit Next.js 15, Prisma ORM, NextAuth.js v5 und Recharts — mit einem hochwertigen Dark/Light-Mode-UI, Docker-Unterstützung und Live-Preisen.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 📊 **Dashboard** | Aggregiertes Gesamtvermögen, Live-Auto-Sync (15s), Echtzeit-Preise mit Flash-Animationen |
| 🎨 **Asset-Verteilung** | Donut-Chart mit Krypto-Branding (BTC, ETH, SOL, ADA), Donut-Center Badge & Proportionalbalken |
| 🔗 **On-Chain Wallet Scanner** | Automatischer Balance-Scan für Ethereum (`0x...`), Bitcoin (`bc1...`), Solana & Polygon Adressen |
| 📄 **PDF Trade-Import** | Parser zur automatischen Extraktion von Kauf/Verkauf-Transaktionen aus PDF-Kontoauszügen |
| 📱 **Mobile Responsiv** | Vollständige Responsivität (keine horizontale Laufleiste) mit mobilem Side-Drawer Navigation |
| 🐳 **Docker Ready** | Optimiertes Multi-Stage Dockerfile (`output: "standalone"`) & Docker Compose Setup |
| 💼 **Assets Tracker** | CRUD für alle Krypto-Positionen, Live-Preise, PnL pro Asset |
| 🖼️ **NFT Manager** | Manuelle NFT-Erfassung mit Floor-Preis und Collection-Tracking |
| 📈 **Trade-Historie** | Vollständige Transaktionsübersicht mit Filter, PDF-Import, Edit & Delete |
| 🧮 **Steuerlogik (§ 23 EStG)** | FIFO / LIFO / HIFO Berechnung, Haltedauer-Kennzeichnung (> 365 Tage steuerfrei), PDF + CSV Export |
| 🏛️ **Börsen-Anbindung** | API-Key Verwaltung für Binance, Kraken, Coinbase, OKX, Bybit |
| 🎨 **Themes & Personalisierung** | 4 Themes (Dark, Midnight, Light, Forest) + 5 Akzentfarben, dynamisches `color-scheme` |

---

## 🐳 Installation mit Docker & Docker Compose

### Schnellstart mit Docker Compose (Empfohlen)

1. Repository klonen:
   ```bash
   git clone https://github.com/Donmeusi/cryptotracker.git
   cd cryptotracker
   ```

2. Container bauen und im Hintergrund starten:
   ```bash
   docker compose up -d --build
   ```

3. Die App ist direkt erreichbar unter:
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
     -e NEXTAUTH_URL=http://localhost:3000 \
     -e NEXTAUTH_SECRET=dein-secret-key-hier \
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

## 📄 Lizenz

Dieses Projekt ist unter der **[MIT-Lizenz](LICENSE)** lizenziert.
