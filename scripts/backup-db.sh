#!/usr/bin/env bash
# Backup SQLite DB. For PostgreSQL use pg_dump instead.
# Usage: ./scripts/backup-db.sh [output_dir]
set -e
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
if [ -n "$DATABASE_URL" ]; then
  # SQLite: DATABASE_URL is file:./dev.db or similar
  FILE=$(echo "$DATABASE_URL" | sed -n 's/^file:\/\///p')
  if [ -n "$FILE" ] && [ -f "$FILE" ]; then
    cp "$FILE" "$OUT_DIR/chaotix-$STAMP.db"
    echo "Backed up to $OUT_DIR/chaotix-$STAMP.db"
  else
    echo "DATABASE_URL not file-based or file not found. Use pg_dump for PostgreSQL."
    exit 1
  fi
else
  echo "Set DATABASE_URL"
  exit 1
fi
