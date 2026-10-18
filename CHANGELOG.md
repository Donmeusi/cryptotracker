# Changelog

Alle wichtigen Änderungen am Projekt **CryptoTracker** werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-10-18 (Sicherheits-Härtung)

### Sicherheit (P0)
- **Admin-Konzept:** System-Endpunkte (`db-config`, `update`, OIDC-Konfiguration) sind auf `ADMIN_EMAILS` beschränkt; ohne Eintrag gesperrt (fail closed).
- **DB-Konfiguration:** GET/POST nur noch für Admins, keine URL-/Passwortausgabe, PostgreSQL/MySQL werden klar abgelehnt (Schema ist SQLite), kein `prisma db push` mehr im Request, `$queryRaw` statt `$queryRawUnsafe`.
- **OIDC:** Die wirkungslose UI-Konfiguration ist deaktiviert; Provider kommen ausschließlich aus Umgebungsvariablen. `allowDangerousEmailAccountLinking` entfernt, `email_verified` wird geprüft, doppelter Provider entfernt.
- **Update-Route:** nur Admin; `repoUrl` und Shell-Interpolation entfernt (`execFile` mit festen Argumenten).
- **PDF-Upload:** Auth, 10-MB-Limit, Magic-Bytes-Prüfung, Upload-Ratelimit, generische Fehlermeldungen.
- **Registrierung:** nach dem ersten Konto standardmäßig geschlossen (`ALLOW_REGISTRATION`), Währungsvalidierung, geprüfte Origin, Rate-Limit-Aufräumung.
- **Login:** Brute-Force-Bremse, Dummy-bcrypt für unbekannte Konten, Sitzungsdauer 7 Tage.

### Sicherheit (P1/P2)
- Security-Header (CSP, HSTS, X-Frame-Options, nosniff, Referrer-/Permissions-Policy), `X-Powered-By` aus.
- Exporte: HTML-Escaping und CSV-Formel-Schutz.
- SMTP-Passwort wird nicht mehr ausgeliefert (`hasSmtpPass`).
- Passwort ändern und Konto löschen implementiert.
- Docker: `cap_drop: ALL`, `no-new-privileges`, Healthcheck, `prisma/*.db` im `.dockerignore`.
- Steuerberechnung: Gebühren in Kostenbasis/Erlös, `TRANSFER_OUT` reduziert den Pool, Rewards als Zufluss mit Hinweis, Überverkauf-Warnungen, Jahreszuordnung Europe/Berlin.
- PDF-Parser: keine Fantasiewerte mehr (1 Stück/100 €/BTC/Binance), deutsche und englische Zahlenformate.
- Währungen: nur EUR (Kurse werden nicht umgerechnet), Formatierung crasht nicht bei ungültigem Code.
- Schema: Indizes auf `Trade(portfolioId, executedAt)`, `Trade(assetId)`, `Account.userId`, `Session.userId`, `Exchange.name`.

### Betrieb
- Backup-Skript für Unraid (SQLite + Compose + db-config, AES-256, täglich 03:45).

### Behoben (Fixed)
- **Dockerfile war nicht baubar:** `apk add --no-exe` ist keine gültige Option (jetzt `--no-cache`), das vom Runner kopierte `public/` fehlte, und `npm ci` scheiterte am Peer-Konflikt zwischen `next-auth@5.0.0-beta` (`nodemailer ^7`) und `nodemailer@8` (jetzt `--legacy-peer-deps`).
- **Next-Build scheiterte an ESLint:** `lib/dbConfig.ts` lädt `fs`/`path` absichtlich per `require`; die vier Stellen sind jetzt begründet freigestellt, statt das Linting global abzuschalten.
- **Frische Datenbank hatte keine Tabellen:** Das Image enthält jetzt die Prisma-CLI und führt beim Start `prisma db push` aus.
- **SQLite-Pfad aus der Umgebung wurde ignoriert:** `loadDbConfig()` fiel für `file:`-URLs immer auf `file:./cryptotracker.db` zurück. Im Container lag die Datenbank damit außerhalb des Volumes.
- **Kein fest eingebautes Auth-Secret mehr:** `docker-compose.yml` verlangt `${AUTH_SECRET}` aus `.env`, statt mit einem Repo-weiten Schlüssel zu signieren. Die Datenbank liegt im Volume `/data`.

### Entfernt (Removed)
- Build-Artefakte aus dem Repo: `tsconfig.tsbuildinfo`, `prisma/db-config.json` und zwei `__pycache__`-Dateien. Alle drei sind jetzt gitignored; `db-config.json` enthält Laufzeit-Zugangsdaten.
- Totes Script `db:seed` (verwies auf ein nicht vorhandenes `prisma/seed.ts`) und die nur dafür genutzte `tsx`-Abhängigkeit.

### Hinzugefügt (Added)
- **Datenbankanbindung der Kernmodule:** Assets/Positionen und Trades werden gespeichert. Positionen werden aus der Trade-Historie berechnet: Käufe mitteln den Einstandspreis, Zuflüsse (Transfer, Staking, Airdrop) erhöhen nur die Menge, Verkäufe reduzieren sie.
- Neue API-Routen: `/api/holdings` (GET/POST/PATCH/DELETE), `/api/trades` (GET/POST/DELETE), `/api/trades/bulk` (idempotenter PDF-Import), `/api/portfolio/reset` (alle Portfolio-Daten löschen) und `/api/profile` (Name/Währung).
- Ein Portfolio pro Benutzer, wird bei Bedarf automatisch angelegt – auch für OIDC-Konten, die der Prisma-Adapter ohne Portfolio erstellt.
- Steuerberechnung (`/api/tax`) rechnet auf den gespeicherten Trades statt auf Mock-Daten.
- Dashboard, Assets und Trades werden serverseitig mit echten Daten gerendert; die Exporte in den Einstellungen nutzen echte Daten.
- Einstellungen: Profil speichern und „Alle Daten löschen“ funktionieren jetzt.

### Entfernt (Removed)
- `lib/mock/data.ts` vollständig entfernt. DeFi, NFTs, Börsen und Analytik zeigen ehrliche Leerzustände statt Beispieldaten; nicht persistierende Formulare wurden entfernt bzw. deaktiviert.
- Zufallskurse als Fallback und zufällige Portfolioverläufe.

### Dokumentation
- README: Projektstatus beschreibt die datenbankgestützten Kernmodule, die bewusst leeren übrigen Module und den weiterhin simulierten Wallet-Scan.
- `.env.example` ergänzt.

## [v0.3.0] - 2026-08-19

### ✨ Hinzugefügt (Added)
- **Universal OIDC / Single Sign-On (SSO) Support**:
  - Unterstützung für OpenID Connect Identity Provider (Pocket-ID, Keycloak, Authentik, Authelia, Zitadel, Auth0, etc.).
  - UI-basierte Verwaltung unter *Einstellungen → Sicherheit*: OIDC-Aktivierung, Issuer URL, Client ID, Client Secret und individueller Provider-Name direkt steuerbar.
  - Dynamischer SSO-Login Button auf der Anmeldeseite (`/anmelden`).
- **Erklärungs-Tooltips für Steuerberichte (`/steuern`)**:
  - Interaktive Hover-Tooltips für FIFO, LIFO und HIFO Methoden mit steuerlichen Erläuterungen (§ 23 EStG, 1-jährige Haltefrist & Verlustverrechnung).
- **Modul-Verwaltung (`/einstellungen`)**:
  - Neuer Menüpunkt *Module & Funktionen* in den Einstellungen zum flexiblen Ein- und Ausblenden der Bereiche DeFi (`/defi`) und NFTs (`/nfts`) in der Seitenleiste in Echtzeit.
- **Externe Datenbank-Konfiguration (`/api/system/db-config`)**:
  - Vollständige UI-Verwaltung unter *Einstellungen → Datenbank & Export* zum Verbinden externer **PostgreSQL**-, **MySQL/MariaDB**- oder **SQLite**-Datenbanken ohne `.env`-Bearbeitung.
  - Inklusive *„Verbindung testen“*-Funktion (`SELECT 1`) und automatischem Schema-Sync.
- **System-Updates & Branch-Wechsel (`/api/system/update`)**:
  - Neuer Einstellungsbereich *System & Updates* analog zur Gefahrstoff-App: Anzeige von installierter/remoter Commit-Version, Wechsel zwischen `main` (Stable) und `beta` (Beta) Kanälen sowie 1-Klick Update-Funktion mit automatischer Prisma-Schema-Synchronisierung.

---

## [v0.2.0] - 2026-08-05

### ✨ Hinzugefügt (Added)
- **Docker & Containerisierung (`Dockerfile` & `docker-compose.yml`)**:
  - Multi-Stage Dockerfile auf Basis von Node 22 Alpine für minimale Image-Größen.
  - Next.js Standalone Output Integration (`output: "standalone"`).
  - Ready-to-use `docker-compose.yml` für 1-Klick Deployment.
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
