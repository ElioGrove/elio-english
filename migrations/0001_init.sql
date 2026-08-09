PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty INTEGER NOT NULL UNIQUE,
  word_count INTEGER NOT NULL DEFAULT 0,
  source_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  headword TEXT NOT NULL,
  normalized TEXT NOT NULL UNIQUE,
  source_phonetic TEXT,
  source_pos TEXT,
  source_meaning TEXT,
  ai_content TEXT,
  ai_model TEXT,
  generated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_words (
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (book_id, word_id),
  UNIQUE (book_id, position)
);

CREATE TABLE IF NOT EXISTS progress (
  word_id INTEGER PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('mastered', 'learning', 'unlearned')),
  first_seen_at TEXT,
  last_studied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  review_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS study_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('mastered', 'learning', 'unlearned')),
  studied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_attempts (
  client_key TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_book_words_position ON book_words(book_id, position);
CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status, last_studied_at);
CREATE INDEX IF NOT EXISTS idx_study_events_date ON study_events(studied_at);

INSERT OR IGNORE INTO user_settings(key, value) VALUES ('current_book', 'foundation');

