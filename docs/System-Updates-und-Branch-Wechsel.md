# System-Updates & Branch-Wechsel (main / beta)

CryptoTracker verfügt über ein integriertes Update- und Kanal-Management direkt in den Einstellungen (analog zur Gefahrstoff-App).

---

## 🔄 Versionsprüfung & Kanal-Wechsel

Unter **Einstellungen → System & Updates** ([http://localhost:3000/einstellungen](http://localhost:3000/einstellungen)):

1. **Versions-Übersicht:**
   - Zeigt die aktuell installierte lokale Commit-ID sowie die neueste Remote-Commit-ID auf GitHub.
   - Zeigt den aktiven Kanal-Badge (`MAIN` oder `BETA`).

2. **Kanal-Auswahl (Branch):**
   - **`Stable (main)`**: Getestete Release-Versionen.
   - **`Beta (beta)`**: Neueste Features und Vorab-Releases.

3. **1-Klick Update durchführen:**
   - Klicke auf **Update / Kanal-Wechsel durchführen**.
   - Das System führt `git fetch origin`, `git checkout <branch>` und `git pull origin <branch>` aus.
   - Anschließend wird das Prisma-Datenbank-Schema automatisch aktualisiert (`npx prisma db push`).
   - Die Konsole zeigt ein detailliertes Ausführungs-Log an.
