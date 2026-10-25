import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';

// Ensure data directory exists
const dbDir = path.dirname(CONFIG.DATABASE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure uploads directory exists
if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
  fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
}

export const db: Database.Database = new Database(CONFIG.DATABASE_PATH);

// Configure SQLite for high concurrency and zero locking issues
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../src/db/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(__dirname, '../../src/db/schema.sql');
    }
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// Persistent cached statement pool to prevent Node 24 GC assertion on Statement::~Statement()
const statementMap = new Map<string, any>();
export function prepareStatement(sql: string): any {
  let stmt = statementMap.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    statementMap.set(sql, stmt);
  }
  return stmt;
}

// Explicit cached transaction runner preventing Node 24 N-API transaction GC crashes
export function runTransaction<T>(fn: () => T): T {
  // If already in a transaction, just run the function
  if (db.inTransaction) {
    return fn();
  }

  prepareStatement('BEGIN IMMEDIATE').run();
  try {
    const res = fn();
    prepareStatement('COMMIT').run();
    return res;
  } catch (err) {
    try {
      prepareStatement('ROLLBACK').run();
    } catch {}
    throw err;
  }
}

export function closeDatabase(): void {
  try {
    db.close();
  } catch {}
}
