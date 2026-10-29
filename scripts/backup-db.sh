#!/bin/bash
# -------------------------------------------------------------------
# ShopFast Daily Database Backup Script (F07 Operational Requirement)
# -------------------------------------------------------------------

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/shopfast}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/shopfast_db_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="shopfast_postgres"
DB_NAME="${POSTGRES_DB:-shopfast_db}"
DB_USER="${POSTGRES_USER:-shopfast_user}"

mkdir -p "$BACKUP_DIR"

echo "======================================================="
echo "📦 Starting ShopFast PostgreSQL Backup: ${TIMESTAMP}"
echo "======================================================="

# Execute pg_dump inside container and compress with gzip
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup completed successfully: ${BACKUP_FILE} (Size: ${FILE_SIZE})"

# Retention policy: Delete backups older than 7 days
echo "🧹 Purging backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "shopfast_db_*.sql.gz" -mtime +7 -delete

echo "🎉 Backup process finished cleanly."
