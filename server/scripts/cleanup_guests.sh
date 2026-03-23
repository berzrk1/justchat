#!/bin/sh
# Delete guests older than 1 day

set -e

echo "Guest user cleanup at $(date)"

PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c \
    "DELETE FROM public.user WHERE is_guest = true AND created_at < NOW() - INTERVAL '5 hours';"

echo "Guest cleanup completed at $(date)"
