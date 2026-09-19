#!/bin/sh
# Runs once, on first start of an empty MySQL data directory, as root over the
# local socket. It creates the schema, seeds it, and creates a dedicated
# least-privilege user for the API.
set -e

: "${EZPOLL_DB_USER:?EZPOLL_DB_USER must be set}"
: "${EZPOLL_DB_PASSWORD:?EZPOLL_DB_PASSWORD must be set}"

echo Creating EZPoll DB
mysql --user=root --password="$MYSQL_ROOT_PASSWORD" < /docker-entrypoint-initdb.d/scripts/ddl.sql

echo Populating EZPoll DB
mysql --user=root --password="$MYSQL_ROOT_PASSWORD" --database="EZPoll" < /docker-entrypoint-initdb.d/scripts/dml.sql

echo Creating least-privilege application user
# escape backslashes and single quotes so any password is a valid SQL literal
escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g"; }
APP_USER="$(escape "$EZPOLL_DB_USER")"
APP_PASSWORD="$(escape "$EZPOLL_DB_PASSWORD")"

# Data access on the EZPoll schema only: no DDL, no GRANT, no other schemas.
mysql --user=root --password="$MYSQL_ROOT_PASSWORD" <<SQL
CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASSWORD}';
ALTER USER '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON EZPoll.* TO '${APP_USER}'@'%';
FLUSH PRIVILEGES;
SQL
