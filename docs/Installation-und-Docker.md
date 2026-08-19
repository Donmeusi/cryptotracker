# Installation & Docker Deployment Guide

## 🐳 Deployment mit Docker Compose (Empfohlen)

Das Docker-Image basiert auf Node 22 Alpine und nutzt Next.js Standalone-Output für minimale Image-Größen.

### 1. Repository klonen
```bash
git clone https://github.com/Donmeusi/cryptotracker.git
cd cryptotracker
```

### 2. Container im Hintergrund starten
```bash
docker compose up -d --build
```

### 3. Zugriff & Verwaltung
- **URL:** [http://localhost:3000](http://localhost:3000)
- **Container stoppen:** `docker compose down`
- **Logs ansehen:** `docker compose logs -f`

---

## 💻 Manuelle Installation (Entwicklung & Server)

### Voraussetzungen
- Node.js 18+ oder 20+
- npm / yarn / pnpm

### Schritt-für-Schritt Anleitung

1. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

2. **Prisma Datenbank-Schema initialisieren:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```

4. **Produktions-Build ausführen:**
   ```bash
   npm run build
   npm run start
   ```
