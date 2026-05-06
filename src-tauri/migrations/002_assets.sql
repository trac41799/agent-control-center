-- ============================================================
-- ACC Asset Manager Migration
-- Migration: 002_assets.sql
-- Created: 2026-05-02
-- Description: Secrets vault and asset management tables
-- ============================================================

CREATE TABLE IF NOT EXISTS secrets_vault (
    id              TEXT PRIMARY KEY,
    key_name        TEXT NOT NULL,
    scope           TEXT NOT NULL DEFAULT 'global',
    agent_id        TEXT,
    project_id      TEXT,
    encrypted_value TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_secrets_scope ON secrets_vault(scope);
CREATE INDEX IF NOT EXISTS idx_secrets_key  ON secrets_vault(key_name);
