#!/bin/bash
# CryptoTracker-Backup: SQLite-Datenbank + Laufzeit-Konfiguration + Compose-Projekt.
# Das Compose-Projekt enthaelt AUTH_SECRET, db-config.json ggf. Zugangsdaten -
# deshalb wird alles mit AES-256 verschluesselt.
set -euo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

APP=/mnt/user/appdata/cryptotracker
PROJ=/boot/config/plugins/compose.manager/projects/cryptotracker
DEST=/mnt/user/backups/cryptotracker
KEYFILE=/mnt/user/appdata/backup.key
LOG=/var/log/cryptotracker-backup.log
KEEP=14
STAMP=$(date +%Y%m%d-%H%M%S)

log(){ echo "$(date '+%Y-%m-%d %H:%M:%S')  $*" >> "$LOG"; }

[ -f "$KEYFILE" ] || { log "FEHLER: Keyfile fehlt ($KEYFILE)"; exit 1; }
[ -f "$APP/data/cryptotracker.db" ] || { log "FEHLER: Datenbank fehlt"; exit 1; }
mkdir -p "$DEST"
WORK=$(mktemp -d /tmp/cryptotracker-backup.XXXXXX) || exit 1
trap 'rm -rf "$WORK"' EXIT

# 1) Konsistente SQLite-Kopie (auch bei laufendem Container)
sqlite3 "$APP/data/cryptotracker.db" ".backup '$WORK/cryptotracker.db'"
[ -s "$WORK/cryptotracker.db" ] || { log "FEHLER: DB-Kopie leer"; exit 1; }

# 2) Laufzeit-Konfiguration und Compose-Projekt
[ -f "$APP/db-config.json" ] && cp -p "$APP/db-config.json" "$WORK/" || true
mkdir -p "$WORK/project"
for f in compose.yml .env; do
  [ -f "$PROJ/$f" ] && cp -p "$PROJ/$f" "$WORK/project/" || true
done

# 3) Host-Automation (Update-Agent, Backups) von /boot mitsichern, damit sie
# nach einem Neuaufbau wiederhergestellt werden kann.
mkdir -p "$WORK/boot"
cp -p /boot/config/plugins/user.scripts/scripts/CryptoTracker_Update/script "$WORK/boot/update-agent.sh" 2>/dev/null || true
cp -p /boot/config/plugins/dynamix/cryptotracker-update.cron "$WORK/boot/" 2>/dev/null || true
cp -p /boot/config/plugins/user.scripts/scripts/cryptotracker-backup/script "$WORK/boot/backup-agent.sh" 2>/dev/null || true
cp -p /boot/config/plugins/dynamix/cryptotracker-backup.cron "$WORK/boot/" 2>/dev/null || true

# 4) Packen + verschluesseln
ITEMS=(cryptotracker.db project boot)
[ -f "$WORK/db-config.json" ] && ITEMS+=(db-config.json)
tar -czf "$WORK/backup.tar.gz" -C "$WORK" "${ITEMS[@]}"
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt \
  -pass file:"$KEYFILE" -in "$WORK/backup.tar.gz" -out "$DEST/cryptotracker-$STAMP.tar.gz.enc"

# 5) Rotation
ls -1t "$DEST"/cryptotracker-*.tar.gz.enc 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f

log "OK  cryptotracker-$STAMP.tar.gz.enc  ($(du -h "$DEST/cryptotracker-$STAMP.tar.gz.enc" | cut -f1))"
