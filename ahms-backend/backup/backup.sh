#!/usr/bin/env bash
# ==========================================================================
# AHMS production database backup
#
# - Dumps the application database with pg_dump (custom format)
# - Keeps the N most recent dumps (retention)
# - Logs every run to ${BACKUP_DIR}/backup.log (failure logging included)
# - Optionally copies the dump off-site (rclone/rsync/cp hook)
# - Exits non-zero on any failure so cron/systemd can alert
#
# Usage (production host):
#   BACKUP_DIR=/var/backups/ahms \
#   DB_HOST=postgres DB_PORT=5432 DB_USER=ahms_app DB_PASSWORD=... DB_NAME=ahms \
#   BACKUP_RETENTION=14 OFF_SITE_DEST=backups:/ahms ./backup.sh
#
# Docker Compose example (runs inside the postgres container's network):
#   docker compose --env-file .env.production exec backend \
#     sh -c 'DB_HOST=postgres DB_USER=ahms_app DB_PASSWORD=$DB_PASSWORD DB_NAME=ahms /app/backup/backup.sh'
# ==========================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ahms}"
RETENTION="${BACKUP_RETENTION:-14}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-ahms_app}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"
DB_NAME="${DB_NAME:?DB_NAME must be set}"
PREFIX="${BACKUP_PREFIX:-ahms_db}"
OFF_SITE_DEST="${OFF_SITE_DEST:-}"

STAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="${BACKUP_DIR}/${PREFIX}_${STAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"
PG_DUMP="${PG_DUMP:-pg_dump}"

mkdir -p "${BACKUP_DIR}"

log() { echo "[$(date -Is)] $*" >> "${LOG_FILE}"; }

log "backup start: ${DUMP_FILE}"
export PGPASSWORD="${DB_PASSWORD}"

if ! "${PG_DUMP}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
     --dbname "${DB_NAME}" --format=custom --no-owner --no-privileges \
     --file "${DUMP_FILE}" >> "${LOG_FILE}" 2>&1; then
  log "backup FAILED (pg_dump)"
  echo "AHMS BACKUP FAILED: see ${LOG_FILE}" >&2
  exit 1
fi

if [ ! -s "${DUMP_FILE}" ]; then
  log "backup FAILED (empty dump produced)"
  rm -f "${DUMP_FILE}"
  exit 1
fi

log "backup ok: $(du -h "${DUMP_FILE}" | cut -f1)"

# Retention: keep the N newest dumps, delete older ones.
if command -v ls >/dev/null 2>&1; then
  ls -1t "${BACKUP_DIR}"/${PREFIX}_*.dump 2>/dev/null \
    | tail -n +$((RETENTION + 1)) | while read -r old; do
        log "retention: removing ${old}"
        rm -f "${old}"
      done
fi

# Optional off-site copy hook. Example destinations:
#   rclone:  OFF_SITE_DEST='backups:ahms-prod/db'
#   rsync:   OFF_SITE_DEST='user@host:/backups/ahms'
if [ -n "${OFF_SITE_DEST}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    rclone copy "${DUMP_FILE}" "${OFF_SITE_DEST}" >> "${LOG_FILE}" 2>&1 \
      && log "off-site copy ok via rclone" \
      || { log "off-site copy FAILED (rclone)"; exit 1; }
  elif command -v rsync >/dev/null 2>&1; then
    rsync -a "${DUMP_FILE}" "${OFF_SITE_DEST}" >> "${LOG_FILE}" 2>&1 \
      && log "off-site copy ok via rsync" \
      || { log "off-site copy FAILED (rsync)"; exit 1; }
  else
    log "off-site copy SKIPPED (neither rclone nor rsync installed)"
  fi
fi

log "backup done: ${DUMP_FILE}"
echo "OK ${DUMP_FILE}"