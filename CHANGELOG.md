# Changelog

Alle wichtigen Änderungen am Projekt **CryptoTracker** werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.2.0] - 2026-08-05

### ✨ Hinzugefügt (Added)
- **On-Chain Wallet Auto-Sync & Scanner (`/api/wallet/scan`)**:
  - Unterstützung für Ethereum (`0x...`), Bitcoin (`bc1...`/`1...`), Solana und Polygon Adressen.
  - Automatisches Scannen und Abrufen von Token-Guthaben (ETH, USDT, LINK, BTC, SOL).
  - Web3 Modal `+ Wallet Scannen` mit Adress-Kopierfunktion und Direktlinks zu Block-Explorern (Etherscan, Mempool.space).
- **PDF-Import für Trade-Historien (`/api/trades/parse-pdf`)**:
  - Parser zur automatischen Extraktion von Kauf/Verkauf-Transaktionen aus PDF-Kontoauszügen.
  - Vorschau-Modal mit konfigurierbarer Spalten-Zuordnung.
- **Interaktiver Donut-Chart für Asset-Verteilung (`AllocationChart`)**:
  - Marken-Farbsystem für Haupt-Assets (BTC Orange, ETH Indigo, SOL Mint, ADA Blau, UNI Pink).
  - Dynamisches Donut-Mittelpunkt-Badge zur Anzeige von Markt-Dominanz und Gesamtwerten beim Hovern.
  - Legendenelemente mit visuellen Fortschrittsbalken.
- **Mobile Navigation & Header (`Sidebar`)**:
  - Vollständige Responsivität auf allen Bildschirmgrößen (Desktop, Tablet, Smartphone).
  - Mobile Top-Bar mit Hamburger-Menü und Side-Drawer Navigation.
- **MIT Lizenz**: Offizielle Einbindung der MIT Open-Source Lizenz.

### 🎨 Verbessert (Improved)
- **Theme- & Kontrastoptimierung**:
  - Dynamische Anpassung von `color-scheme` in `html` & Formularelementen für einheitliches Styling im Light & Dark Mode.
  - Kontrastverbesserungen für native `<select>` Popups und Datums-Auswahlfelder (`datetime-local`).
- **Layout & Overflow**:
  - Striktes `overflow-x: hidden` auf allen Haupt-Containern verhindert jegliche horizontale Laufleiste am unteren Bildschirmrand.
  - Eingebettete Scroll-Container für alle Datentabellen (`.table-wrapper`).
- **Dashboard Refactoring**:
  - Entfernung redundanter Zeitreihen-Performancekarten zugunsten des dedizierten `/analytik`-Bereichs für mehr Übersichtlichkeit.

### 🐛 Behoben (Fixed)
- Korrektur von Turbopack `.next` Cache-Invalidierungskonflikten bei parallelen Server-Builds.
- Behebung von ESLint & OpenGraph Metadata Warnungen im Root-Layout.

---

## [v0.1.0] - 2026-08-01

### ✨ Erstveröffentlichung (Initial Release)
- Basis-Dashboard mit Portfolio-Übersicht und Live-Kursen.
- Asset-Verwaltung und Trades-Historie.
- Steuerberechnung nach FIFO-, LIFO- und HIFO-Methoden.
- PDF- und CSV-Exportfunktion.
- 4 Farbschemata (Dark, Midnight, Light, Forest).
