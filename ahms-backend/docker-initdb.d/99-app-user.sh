#!/bin/sh
# Creates the least-privilege application login role on first DB init.
#
# The postgres image only creates the ${POSTGRES_USER} maintenance role
# (a superuser, used internally by init). This script adds the role the app
# will actually connect as: it owns the application database and can run
# migrations there, but has no cluster-wide superuser privileges.
#
# Runs once, on a fresh volume, from within docker-entrypoint-initdb.d.
set -euo pipefail

if [ -z "${DB_APP_USER:-}" ] || [ -z "${DB_APP_PASSWORD:-}" ]; then
	echo "ERROR: DB_APP_USER/DB_APP_PASSWORD must be set to create the app role" >&2
	exit 1
fi

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
	CREATE ROLE "$DB_APP_USER" LOGIN PASSWORD '$DB_APP_PASSWORD';
	ALTER DATABASE "$POSTGRES_DB" OWNER TO "$DB_APP_USER";
	GRANT ALL PRIVILEGES ON DATABASE "$POSTGRES_DB" TO "$DB_APP_USER";
EOSQL