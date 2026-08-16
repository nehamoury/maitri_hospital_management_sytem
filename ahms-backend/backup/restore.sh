#!/usr/bin/env bash
# ==========================================================================
# AHMS database restore — restore a pg_dump custom-format backup.
#
# Usage:
#   ./restore.sh [DUMP_FILE]    # restore latest backup by default
#
# Required env:
#   DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME  (target database)
#   TARGET_DB_NAME ... optionally a different database to restore INTO
#
# Example:
#   DB_HOST=postgres DB_USER=ahms_app DB_PASSWORD=$DB_PASSWORD DB_NAME=ahms \
#     TARGET_DB_NAME=ahms_restore_test ./restore.sh /var/backups/ahms/ahms_db_20260101_000000.dump
# ==========================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ahms}"
PREFIX="${BACKUP_PREFIX:-ahms_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-ahms_app}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"
DB_NAME="${DB_NAME:?DB_NAME must be set}"
TARGET_DB_NAME="${TARGET_DB_NAME:-${DB_NAME}}"
PG_RESTORE="${PG_RESTORE:-pg_restore}"
PSQL="${PSQL:-psql}"

DUMP_FILE="${1:-}"
if [ -z "${DUMP_FILE}" ]; then
  DUMP_FILE="$(ls -1t "${BACKUP_DIR}"/${PREFIX}_*.dump 2>/dev/null | head -n1)"
  [ -n "${DUMP_FILE}" ] || { echo "no backup found in ${BACKUP_DIR}" >&2; exit 1; }
fi
[ -f "${DUMP_FILE}" ] || { echo "backup file not found: ${DUMP_FILE}" >&2; exit 1; }

export PGPASSWORD="${DB_PASSWORD}"

echo "restoring ${DUMP_FILE} -> database ${TARGET_DB_NAME}"

if [ "${TARGET_DB_NAME}" != "${DB_NAME}" ]; then
  "${PSQL}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"${TARGET_DB_NAME}\";" \
    -c "CREATE DATABASE \"${TARGET_DB_NAME}\" OWNER \"${DB_USER}\";"
fi

"${PG_RESTORE}" -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
  --dbname "${TARGET_DB_NAME}" --no-owner --no-privileges --clean --if-exists \
  "${DUMP_FILE}"

echo "restore complete: ${TARGET_DB_NAME}"