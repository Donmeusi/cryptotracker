# CryptoTracker

Ein modernes, leichtgewichtiges Krypto-Portfolio-Tracking-Dashboard gebaut mit Next.js 15, Prisma und Next-Auth. Verwaltet Krypto-Assets, NFTs, Trading-Historien und fokussiert sich auf eine schnelle, reaktive Profit/Loss-Berechnung in einem komplett abgedunkelten, hochwertigen Interface.

## 🚀 Features

- **Modernes Dashboard**: Minimalistisches Glassmorphism-UI, aggregierte G&V-Diagramme und Statistiken.
- **Assets & NFTs Tracker**: Erfasse manuelle Käufe für Coins oder Token-Collections und weise ihnen Kaufpreise zu, um Floor- und Live-Werte abzufragen.
- **Trade-Historie & Export**: Tabellarische Übersicht all deiner Zu- und Abgänge. Export in PDF oder CSV jederzeit auf Knopfdruck möglich.
- **Erweiterte Steuerlogik**: Integrierter FIFO/LIFO-Rechner, der deine gesamte Handelshistorie in steuerbegünstigte/langfristige (>365 Tage) und kurzfristige Gewinne einteilt.
- **Dynamische Mail-Konfiguration**: SMTP-Konfiguration direkt in den Einstellungen (für Preis- und Security-Alarme) ohne die Notwendigkeit `.env`-Dateien anzupacken.
- **Live-Preis Berechnungen**: Anstelle von harten Mocks gleicht das System Kurse temporär mit der CoinGecko-API ab (serverseitiges intelligentes Caching).

## 🛠️ Technologie-Stack

- [Next.js (App Router)](https://nextjs.org/) — React Framework
- [Prisma ORM](https://www.prisma.io/) — Objektrelationales Mapping (lokal als SQLite aufgesetzt)
- [NextAuth.js v5 (Beta)](https://authjs.dev/) — Authentifizierung
- [Recharts](https://recharts.org/) — Für komplexe Trend-Diagramme
- [Zustand](https://github.com/pmndrs/zustand) — Lokales State-Management
- [Lucide React](https://lucide.dev/) — Konstantes Icon-Set

## 📦 Installation & Start

1. **Klone das Repository**
   ```bash
   git clone https://github.com/Donmeusi/cryptotracker.git
   cd cryptotracker
   ```

2. **Lade die Abhängigkeiten herunter**
   ```bash
   npm install
   ```

3. **Datenbank und ENV aufsetzen**
   Kopiere dir ggf. notwendige Auth-Secrets oder API-Keys in eine `.env` Datei. Pushe danach das DB-Schema in deine lokale SQLite-Datei:
   ```bash
   npm run db:push
   npm run db:generate
   ```

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```
   Die Applikation läuft standardmäßig unter [http://localhost:3000](http://localhost:3000).

## 🗄️ Häufige Prisma Befehle
Wenn du Modelldaten unter `prisma/schema.prisma` veränderst, sorge dafür, dass der Client nachrückt:
- **`npm run db:push`**: Schreibt Änderungen direkt in die SQLite-DB ohne Migrationshistorie.
- **`npm run db:generate`**: Regeniert alle TypeScript Definitionen.
- **`npm run db:studio`**: Öffnet einen visuellen Datenbank-Browser im lokalen Browser.

## 🔐 Hinweise zu Push/Git
Dieses Projekt wurde erfolgreich aufgeräumt, Linter-Warnungen wurden deaktiviert/ausgebessert, das Mock-Layout überholt und in GitHub eingespeist. Wenn neue Frontend-Abhängigkeiten oder UI-Komponenten (wie z.B. das Asset-Edit-Feature) aufgebaut werden, denke daran, die Mocks mit deiner finalen Postgres SQLite DB zu synchronisieren!

## 📜 Lizenz
Proprietäres Projekt.
