-- 001_init.sql
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  nom TEXT,
  marque TEXT,
  prix REAL NOT NULL DEFAULT 0,
  promotion REAL NOT NULL DEFAULT 0,
  short_description TEXT,
  description TEXT,
  categorie TEXT,
  etat TEXT,
  status TEXT DEFAULT 'active',
  image1 TEXT,
  image2 TEXT,
  image3 TEXT,
  image4 TEXT,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  stock_status TEXT NOT NULL DEFAULT 'in_stock',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
