#!/bin/bash
set -e

echo "Restaurando backup do banco de dados..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < /docker-entrypoint-initdb.d/backup.dump
echo "Backup restaurado com sucesso."