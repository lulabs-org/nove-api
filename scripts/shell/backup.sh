#!/bin/bash

# 设置错误时退出
set -e

# 显示当前工作目录
echo "Current working directory: $(pwd)"
echo "Checking for .env file..."

# 列出所有 .env 文件
ls -la .env* 2>/dev/null || echo "No .env files found"

# 检查是否在正确的目录
if [ ! -f ".env" ]; then
    echo "Error: .env file not found in $(pwd)"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "Found .env file"

# 加载环境变量
set -a
source .env
set +a

# 检查 DATABASE_URL 是否存在
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in environment variables."
    exit 1
fi

echo "DATABASE_URL loaded successfully"

# 设置 PostgreSQL 17 的 pg_dump 路径
PG_DUMP_PATH="/opt/homebrew/opt/postgresql@17/bin/pg_dump"

# 检查 PostgreSQL 17 的 pg_dump 是否存在
if [ ! -f "$PG_DUMP_PATH" ]; then
    echo "❌ Error: PostgreSQL 17 pg_dump not found at $PG_DUMP_PATH"
    echo "Please ensure PostgreSQL 17 is installed: brew install postgresql@17"
    exit 1
fi

echo "Using PostgreSQL 17 pg_dump: $PG_DUMP_PATH"
echo "pg_dump version: $($PG_DUMP_PATH --version)"

# 创建备份目录（如果不存在）
mkdir -p scripts/backups

# 生成备份文件名
BACKUP_FILE="scripts/backups/backup_$(date +%Y%m%d_%H%M%S).sql"

# 执行备份
echo "Starting database backup..."
if "$PG_DUMP_PATH" "$DATABASE_URL" > "$BACKUP_FILE"; then
    echo "✅ Backup completed successfully: $BACKUP_FILE"
    echo "📊 Backup file size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ Backup failed!"
    exit 1
fi