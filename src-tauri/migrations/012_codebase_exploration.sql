-- ============================================================
-- ACC Codebase Exploration Schema
-- Migration: 009_codebase_exploration.sql
-- Description: Codebase file discovery, symbol extraction,
--              AST-aware chunking, dependency graph, BM25 index
-- ============================================================

-- ============================================================
-- CODEBASE FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS codebase_files (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id),
  file_path         TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  extension         TEXT NOT NULL,
  language          TEXT,
  loc               INTEGER,
  last_modified     TEXT,
  coverage_status   TEXT DEFAULT 'unexplored',
  last_indexed_at   TEXT,
  UNIQUE(project_id, file_path)
);

-- ============================================================
-- CODEBASE SYMBOLS
-- ============================================================
CREATE TABLE IF NOT EXISTS codebase_symbols (
  id                TEXT PRIMARY KEY,
  file_id           TEXT NOT NULL REFERENCES codebase_files(id),
  symbol_name       TEXT NOT NULL,
  symbol_type       TEXT NOT NULL,
  signature         TEXT,
  line_start        INTEGER,
  line_end          INTEGER,
  parent_symbol_id  TEXT REFERENCES codebase_symbols(id),
  page_rank         REAL DEFAULT 0.0
);

-- ============================================================
-- CODEBASE CHUNKS (AST-aware code chunks)
-- ============================================================
CREATE TABLE IF NOT EXISTS codebase_chunks (
  id                TEXT PRIMARY KEY,
  file_id           TEXT NOT NULL REFERENCES codebase_files(id),
  chunk_type        TEXT NOT NULL,
  symbol_name       TEXT,
  parent_context    TEXT,
  content           TEXT NOT NULL,
  line_start        INTEGER,
  line_end          INTEGER,
  token_count       INTEGER,
  embedding         BLOB
);

-- ============================================================
-- CODEBASE DEPENDENCIES (file dependency edges)
-- ============================================================
CREATE TABLE IF NOT EXISTS codebase_dependencies (
  id                TEXT PRIMARY KEY,
  source_file_id    TEXT NOT NULL REFERENCES codebase_files(id),
  target_file_id    TEXT NOT NULL REFERENCES codebase_files(id),
  dep_type          TEXT NOT NULL,
  UNIQUE(source_file_id, target_file_id, dep_type)
);

-- ============================================================
-- CODEBASE BM25 INDEX (token index)
-- ============================================================
CREATE TABLE IF NOT EXISTS codebase_bm25_index (
  id                TEXT PRIMARY KEY,
  chunk_id          TEXT NOT NULL REFERENCES codebase_chunks(id),
  token             TEXT NOT NULL,
  frequency         INTEGER DEFAULT 1,
  UNIQUE(chunk_id, token)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_codebase_files_project_ext ON codebase_files(project_id, extension);
CREATE INDEX IF NOT EXISTS idx_codebase_symbols_file_type ON codebase_symbols(file_id, symbol_type);
CREATE INDEX IF NOT EXISTS idx_codebase_chunks_file       ON codebase_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_codebase_dependencies_src  ON codebase_dependencies(source_file_id);
CREATE INDEX IF NOT EXISTS idx_codebase_bm25_token        ON codebase_bm25_index(token);
