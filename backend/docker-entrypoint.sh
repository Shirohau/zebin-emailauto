#!/bin/sh
set -e

mkdir -p "$(dirname "${DJANGO_DB_PATH:-/data/db.sqlite3}")"
python manage.py migrate --noinput

exec "$@"
