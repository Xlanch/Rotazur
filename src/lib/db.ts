import "server-only";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "rota.db");

// Singleton database instance across Next.js dev server reloads
const globalForDb = globalThis as unknown as { __rota_db?: DatabaseSync; __rota_schema_version?: number };

function getDbInstance(): DatabaseSync {
  if (globalForDb.__rota_db && globalForDb.__rota_schema_version === 4) return globalForDb.__rota_db;
  const database = globalForDb.__rota_db ?? new DatabaseSync(dbPath);
  database.exec("PRAGMA busy_timeout = 15000;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");

  // Serialize first-run setup/migrations across Next.js workers. The column check
  // must run inside the same transaction as ALTER TABLE to prevent a race.
  database.exec("BEGIN IMMEDIATE;");
  try {
  // Tabloları oluştur
  database.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key_hash TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      password_salt TEXT,
      avatar_url TEXT,
      provider TEXT DEFAULT 'credentials',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);

    CREATE TABLE IF NOT EXISTS saved_trips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      city_id TEXT NOT NULL,
      city_name TEXT NOT NULL,
      city_flag TEXT NOT NULL,
      country TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_cost_try REAL NOT NULL,
      travelers INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      city_id TEXT NOT NULL,
      city_name TEXT NOT NULL,
      target_price_try REAL NOT NULL,
      current_price_try REAL NOT NULL,
      email TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_price_sync (
      route_key TEXT PRIMARY KEY,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      airline TEXT NOT NULL,
      price_try REAL NOT NULL,
      deep_link TEXT NOT NULL,
      depart_date TEXT,
      return_date TEXT,
      data_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_weather_sync (
      city_id TEXT PRIMARY KEY,
      city_name TEXT NOT NULL,
      country TEXT NOT NULL,
      temp REAL NOT NULL,
      weather_code INTEGER NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      locale TEXT DEFAULT 'tr',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_trips_user_id ON saved_trips(user_id);
    CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email);
    CREATE INDEX IF NOT EXISTS idx_reset_email ON password_reset_codes(email);
    CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
  `);

  // Previously issued sessions may originate from the unverified Google endpoint.
  const sessionColumns = database.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
  if (!sessionColumns.some((column) => column.name === "auth_version")) {
    database.exec("ALTER TABLE sessions ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0");
  }
  // Upgrade only previously verified sessions. Raw cookie values never remain
  // in storage; hashing their IDs preserves existing cookies across the change.
  const oldSessions = database.prepare("SELECT id FROM sessions WHERE auth_version = 1 AND length(id) = 64").all() as { id: string }[];
  const migrateSession = database.prepare("UPDATE sessions SET id = ? WHERE id = ? AND auth_version = 1");
  for (const session of oldSessions) {
    if (/^[a-f0-9]{64}$/.test(session.id)) migrateSession.run("sha256:" + createHash("sha256").update(session.id).digest("hex"), session.id);
  }
  database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }

  globalForDb.__rota_db = database;
  globalForDb.__rota_schema_version = 4;

  return database;
}

export const db = getDbInstance();
