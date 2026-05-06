-- ============================================================
-- ACC Integrations Schema Migration
-- Migration: 003_integrations.sql
-- Created: 2026-05-02
-- Description: Phase 7 Supabase & GitHub first-class integrations
-- Replaces legacy schemas from 001_init with full Phase 7 schemas
-- ============================================================

DROP TABLE IF EXISTS supabase_configs;
DROP TABLE IF EXISTS github_configs;

CREATE TABLE IF NOT EXISTS supabase_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    supabase_project_ref TEXT NOT NULL,
    supabase_url TEXT,
    anon_key TEXT,
    service_role_key TEXT,
    feature_groups TEXT NOT NULL DEFAULT '{}',
    read_only BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_supabase_project ON supabase_configs(project_id);

CREATE TABLE IF NOT EXISTS github_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    repo_visibility TEXT NOT NULL DEFAULT 'unknown',
    lockdown_enabled BOOLEAN NOT NULL DEFAULT 0,
    token_present BOOLEAN NOT NULL DEFAULT 0,
    features TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_github_project ON github_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_github_repo ON github_configs(repo_owner, repo_name);
