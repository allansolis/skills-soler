#!/usr/bin/env npx tsx
// Force a WAL checkpoint so data/crm.db has all the data merged in,
// and make a timestamped backup copy.
import Database from "better-sqlite3";
import fs from "fs";

const src = "data/crm.db";
const db = new Database(src);
const result = db.pragma("wal_checkpoint(TRUNCATE)");
console.log("wal_checkpoint(TRUNCATE) ->", result);
db.close();

const stat = fs.statSync(src);
console.log(`crm.db size after checkpoint: ${stat.size} bytes`);

const backupPath = `data/crm-backup-${Date.now()}.db`;
fs.copyFileSync(src, backupPath);
const backupStat = fs.statSync(backupPath);
console.log(`backup -> ${backupPath} (${backupStat.size} bytes)`);
