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
   - Anschließend werden Abhängigkeiten installiert, das Prisma-Schema aktualisiert und ein Produktions-Build erstellt.
   - Die Konsole zeigt ein detailliertes Ausführungs-Log an.

---

## 🐳 Update im Container (Host-Agent)

Im Container gibt es weder `.git` noch die Quellen – die App kann sich dort **nicht selbst neu bauen**. Deshalb übergibt sie den Auftrag an einen Host-Agenten:

1. Compose bindet den Quellklon **lesend** unter `/repo` und ein Schreibverzeichnis unter `/update` ein und setzt `CONTAINER_MODE=true`.
2. Der Button schreibt `request.json` mit dem gewünschten Branch nach `/update`.
3. Ein Host-Agent (Unraid-User-Script, per Cron jede Minute gestartet) liest die Anfrage, führt `git fetch`/`checkout`/`pull` im Klon aus, baut mit `docker compose up -d --build` und schreibt `status.json` zurück.
4. Das Panel fragt den Status alle fünf Sekunden ab und zeigt „Update abgeschlossen“ oder den Fehler samt Log.

Voraussetzungen:

- Mounts `…/src:/repo:ro` und `…/update:/update`
- `/update` muss für die Container-UID 1001 beschreibbar sein
- Host-Agent: `/boot/config/plugins/user.scripts/scripts/CryptoTracker_Update/script`, Cron in `/boot/config/plugins/dynamix/cryptotracker-update.cron`

Ohne diese Einrichtung bleibt das Panel im Container ohne Funktion; die Aktualisierung erfolgt dann manuell über den Compose-Manager.
