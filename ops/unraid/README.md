# Unraid-Hostskripte für CryptoTracker

Diese Skripte liegen auf dem Unraid-Host unter `/boot` und werden nicht vom
Container gebaut. Sie sind hier als Referenz und für die Wiederherstellung
abgelegt.

## Update-Agent

- Datei im Container-Repo: `ops/unraid/cryptotracker-update-agent.sh`
- Ziel auf Unraid: `/boot/config/plugins/user.scripts/scripts/CryptoTracker_Update/script`
- Cron: `/boot/config/plugins/dynamix/cryptotracker-update.cron`

```cron
* * * * * /bin/bash /boot/config/plugins/user.scripts/scripts/CryptoTracker_Update/script >> /var/log/cryptotracker-update.log 2>&1
```

Der Agent liest `request.json` aus `/mnt/user/appdata/cryptotracker/update/`,
führt `git fetch/checkout/pull` im Klon aus, baut den Compose-Stack neu und
schreibt `status.json` zurück. Ohne Anfrage beendet er sich sofort.

## Backup

- Datei im Container-Repo: `ops/unraid/cryptotracker-backup.sh`
- Ziel auf Unraid: `/boot/config/plugins/user.scripts/scripts/cryptotracker-backup/script`
- Cron: `/boot/config/plugins/dynamix/cryptotracker-backup.cron`

```cron
45 3 * * * /bin/bash /boot/config/plugins/user.scripts/scripts/cryptotracker-backup/script >> /var/log/cryptotracker-backup.log 2>&1
```

Sichert SQLite-DB (`.backup`), `db-config.json`, das Compose-Projekt (inkl.
`AUTH_SECRET`) sowie die Host-Automation, AES-256-verschlüsselt mit
`/mnt/user/appdata/backup.key`, 14 Tage Rotation.

## Installation

```bash
mkdir -p /boot/config/plugins/user.scripts/scripts/CryptoTracker_Update
cp cryptotracker-update-agent.sh /boot/config/plugins/user.scripts/scripts/CryptoTracker_Update/script
chmod 700 /boot/config/plugins/user.scripts/scripts/CryptoTracker_Update/script
printf "CryptoTracker Update" > /boot/config/plugins/user.scripts/scripts/CryptoTracker_Update/name

mkdir -p /boot/config/plugins/user.scripts/scripts/cryptotracker-backup
cp cryptotracker-backup.sh /boot/config/plugins/user.scripts/scripts/cryptotracker-backup/script
chmod 700 /boot/config/plugins/user.scripts/scripts/cryptotracker-backup/script
printf "CryptoTracker Backup" > /boot/config/plugins/user.scripts/scripts/cryptotracker-backup/name

mkdir -p /mnt/user/appdata/cryptotracker/update
chown -R 1001:1001 /mnt/user/appdata/cryptotracker/update

# Cron-Dateien anlegen (siehe oben), dann:
update_cron
```

`/boot` ist FAT-formatiert; die Skripte werden deshalb explizit mit
`/bin/bash` gestartet.
