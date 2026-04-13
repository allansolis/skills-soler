#!/bin/bash
# Daily backup script for Esmeraldas SOLER Claude ecosystem
# Runs daily via Windows Task Scheduler

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="$HOME/.claude/skills/auto-crm/backups/daily_$DATE"

# Skip if already backed up today
if [ -d "$BACKUP_DIR" ]; then
  echo "Backup already exists for $DATE"
  exit 0
fi

mkdir -p "$BACKUP_DIR/memory"

# 1. Claude Desktop config (MCP servers)
cp "$APPDATA/Claude/claude_desktop_config.json" "$BACKUP_DIR/" 2>/dev/null

# 2. Memory files
cp "$HOME/.claude/projects/C--Users-Usuario-Desktop-Bot-glass-soler/memory/"*.md "$BACKUP_DIR/memory/" 2>/dev/null

# 3. CRM database
cp "$HOME/.claude/skills/auto-crm/data/crm.db" "$BACKUP_DIR/crm.db" 2>/dev/null

# 4. Bot Elena
cp "$HOME/Desktop/Bot glass soler/bot.py" "$BACKUP_DIR/bot.py" 2>/dev/null

# 5. Cleanup: keep only last 7 days
find "$HOME/.claude/skills/auto-crm/backups/" -maxdepth 1 -name "daily_*" -mtime +7 -exec rm -rf {} \; 2>/dev/null

echo "Backup completed: $BACKUP_DIR"
