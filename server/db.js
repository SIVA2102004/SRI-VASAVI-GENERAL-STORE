require('dotenv').config();
const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = Boolean(DATABASE_URL && DATABASE_URL.trim() !== '');

let pgPool = null;
let sqliteDb = null;

function normalizePersonName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

if (isPostgres) {
  console.log('📡 Connecting to ONLINE PostgreSQL Database...');
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log('📂 No DATABASE_URL provided. Using Local SQLite fallback.');
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'daybook.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
}

// Unified query runner for both Online PostgreSQL and Local SQLite
async function query(sql, params = []) {
  if (isPostgres) {
    // Convert ? placeholders to $1, $2, ... for PostgreSQL
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    } else {
      const info = stmt.run(...params);
      return info;
    }
  }
}

// Unified single-row query runner
async function queryOne(sql, params = []) {
  if (isPostgres) {
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0] || null;
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.get(...params) || null;
  }
}

// Unified write/insert runner returning inserted or updated row
async function execute(sql, params = []) {
  if (isPostgres) {
    let paramIndex = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pgPool.query(pgSql, params);
    return {
      lastInsertRowid: res.rows && res.rows[0] ? res.rows[0].id : null,
      rows: res.rows,
      rowCount: res.rowCount
    };
  } else {
    const info = sqliteDb.prepare(sql).run(...params);
    return info;
  }
}

// Initialize tables in the active database
async function initDb() {
  if (isPostgres) {
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS people (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          person_name VARCHAR(255) NOT NULL,
          normalized_name VARCHAR(255) NOT NULL,
          mobile_number VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, normalized_name)
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
          transaction_date DATE NOT NULL,
          transaction_type VARCHAR(50) NOT NULL,
          amount NUMERIC(15, 2) NOT NULL CHECK(amount >= 0),
          payment_mode VARCHAR(50) NOT NULL,
          description TEXT,
          notes TEXT,
          reference_number VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_people_user ON people(user_id);
        CREATE INDEX IF NOT EXISTS idx_people_norm_name ON people(user_id, normalized_name);
        CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_tx_person ON transactions(person_id);
        CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_tx_user_person_date ON transactions(user_id, person_id, transaction_date);
      `);
      console.log('✅ Online PostgreSQL database initialized successfully.');
    } catch (err) {
      console.error('❌ Failed to initialize Online PostgreSQL database:', err.message);
    }
  } else {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        person_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        mobile_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, normalized_name)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        person_id INTEGER NOT NULL,
        transaction_date TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0),
        payment_mode TEXT NOT NULL,
        description TEXT,
        notes TEXT,
        reference_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_people_user ON people(user_id);
      CREATE INDEX IF NOT EXISTS idx_people_norm_name ON people(user_id, normalized_name);
      CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_tx_person ON transactions(person_id);
      CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_tx_user_person_date ON transactions(user_id, person_id, transaction_date);
    `);
  }
}

initDb();

module.exports = {
  isPostgres,
  query,
  queryOne,
  execute,
  normalizePersonName,
  pgPool
};
