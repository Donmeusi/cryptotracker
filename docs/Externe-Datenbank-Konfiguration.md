# Externe Datenbank-Konfiguration (PostgreSQL, MySQL, SQLite)

> **Wichtig (Oktober 2026): PostgreSQL und MySQL werden derzeit nicht unterstützt.**
> Das Prisma-Schema ist fest auf `provider = "sqlite"` eingestellt. Die API lehnt
> andere Datenbanktypen mit einer Fehlermeldung ab. Die Oberfläche erlaubt nur
> noch SQLite; die frühere Auswahl war eine Attrappe. Ein Wechsel auf einen
> Server-Datenbanktyp würde eine Schema-Migration und einen zweiten Provider
> erfordern.

CryptoTracker erlaubt es, die SQLite-Datei über die Benutzeroberfläche zu ändern.

---

## ⚙️ Einrichtung unter Einstellungen → Datenbank & Export

1. Öffne die **Einstellungen** unter [http://localhost:3000/einstellungen](http://localhost:3000/einstellungen).
2. Wähle den Reiter **Datenbank & Export**.
3. Wähle im Dropdown deinen **Datenbank-Typ**:
   - `SQLite (Lokale Datei)` (Standard)
   - `PostgreSQL (Server)`
   - `MySQL / MariaDB (Server)`
4. Fülle die Server-Daten aus:
   - **Host / Server-IP:** z. B. `localhost` oder `192.168.1.100`
   - **Port:** `5432` (Postgres) oder `3306` (MySQL)
   - **Datenbank-Name:** z. B. `cryptotracker`
   - **Benutzername & Passwort**
5. *(Optional)* Du kannst auch einen kompletten Connection-String im Format `postgresql://user:pass@host:5432/dbname` angeben.

---

## 🧪 Verbindung testen & Speichern

1. Klicke auf **Verbindung testen**.
   - Das System prüft die TCP-Servererreichbarkeit und führt ein Test-Query (`SELECT 1`) aus.
2. Wenn der Test grün bestätigt wird, klicke auf **Speichern & Verbinden**.
   - Die Einstellungen werden in `prisma/db-config.json` gespeichert und das Daten-Schema wird automatisch auf der Ziel-Datenbank synchronisiert (`npx prisma db push`).
