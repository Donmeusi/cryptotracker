#!/bin/bash
# CryptoTracker Update-Agent (Unraid)
#
# Wird jede Minute vom Cron aufgerufen. Liegt in der App eine Anfrage unter
# /mnt/user/appdata/cryptotracker/update/request.json, holt dieses Skript den
# gewuenschten Branch, baut den Compose-Stack neu und schreibt den Status
# zurueck, den die App im Panel anzeigt.
#
# Bewusst KEIN automatisches Update: ohne Anfrage beendet sich das Skript
# sofort.

set -u

BASE=/mnt/user/appdata/cryptotracker
REQ="$BASE/update/request.json"
STAT="$BASE/update/status.json"
SRC="$BASE/src"
PROJ=/boot/config/plugins/compose.manager/projects/cryptotracker
LOCK=/tmp/cryptotracker-update.lock

# Keine Anfrage -> nichts tun.
[ -f "$REQ" ] || exit 0

# Ueberschneidungen vermeiden.
exec 9>"$LOCK"
flock -n 9 || exit 0

# Anfrage atomic vom Tisch nehmen, damit sie nur einmal laeuft.
TMPREQ=$(mktemp /tmp/ct-update-request.XXXXXX)
mv "$REQ" "$TMPREQ" 2>/dev/null || exit 0

BRANCH=$(sed -n 's/.*"targetBranch"[[:space:]]*:[[:space:]]*"\([a-z]*\)".*/\1/p' "$TMPREQ" | head -n1)
rm -f "$TMPREQ"

case "$BRANCH" in
  main|beta) ;;
  *)
    printf '{"state":"error","finishedAt":"%s","message":"Ungueltiger Branch in der Anfrage."}\n' \
      "$(date '+%Y-%m-%dT%H:%M:%S%z')" > "$STAT"
    exit 1
    ;;
esac

LOG=/tmp/cryptotracker-update-run.log
: > "$LOG"

printf '{"state":"running","branch":"%s","startedAt":"%s","message":"Update laeuft"}\n' \
  "$BRANCH" "$(date '+%Y-%m-%dT%H:%M:%S%z')" > "$STAT"

{
  echo "== $(date '+%F %T') Update auf '$BRANCH' =="
  cd "$SRC" || exit 1
  git fetch origin || exit 1
  git checkout "$BRANCH" || exit 1
  git pull --ff-only origin "$BRANCH" || exit 1
  COMMIT=$(git rev-parse --short HEAD)
  echo "Quellstand: $COMMIT"
  cd "$PROJ" || exit 1
  docker compose up -d --build || exit 1
  echo "Container neu gebaut und gestartet."
} >> "$LOG" 2>&1
RC=$?

COMMIT=$(cd "$SRC" && git rev-parse --short HEAD 2>/dev/null)
[ -n "$COMMIT" ] || COMMIT="unknown"

# Log-Ende als JSON-String aufbereiten (Backslash, Quote, Zeilenumbrueche).
LOGTXT=$(tail -n 40 "$LOG" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | awk '{printf "%s\\n", $0}')

if [ "$RC" -eq 0 ]; then
  STATE=done
  MSG="Update abgeschlossen."
else
  STATE=error
  MSG="Update fehlgeschlagen - siehe /var/log/cryptotracker-update.log."
fi

cat > "$STAT.tmp" <<EOF
{"state":"$STATE","branch":"$BRANCH","commit":"$COMMIT","finishedAt":"$(date '+%Y-%m-%dT%H:%M:%S%z')","message":"$MSG","log":"$LOGTXT"}
EOF
mv "$STAT.tmp" "$STAT"

exit "$RC"
