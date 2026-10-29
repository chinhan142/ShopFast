#!/bin/bash
# -------------------------------------------------------------------
# ShopFast Database Restore Rehearsal Script (SRS Recovery Protocol)
# -------------------------------------------------------------------

set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore-db.sh <path_to_backup_file.sql.gz>"
  echo "Example: ./restore-db.sh /var/backups/shopfast/shopfast_db_20261029_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="shopfast_postgres"
DB_NAME="${POSTGRES_DB:-shopfast_db}"
DB_USER="${POSTGRES_USER:-shopfast_user}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found at $BACKUP_FILE"
  exit 1
fi

echo "======================================================="
echo "🔄 Starting Database Restore Rehearsal from: $BACKUP_FILE"
echo "======================================================="

START_TIME=$(date +%s)

# Terminate active connections to allow restore
echo "Terminating active connections..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" || true

# Recreate database
echo "Recreating fresh database '${DB_NAME}'..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};"

# Restore data from gzipped sql dump
echo "Restoring tables and data..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "======================================================="
echo "✅ Database Restore rehearsal SUCCESSFUL!"
echo "⏱️ Total restoration time: ${DURATION} seconds (Threshold: under 30 minutes)"
echo "======================================================="
