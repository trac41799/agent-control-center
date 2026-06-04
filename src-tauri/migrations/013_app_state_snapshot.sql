CREATE TABLE IF NOT EXISTS app_state_snapshot (
    id INTEGER PRIMARY KEY DEFAULT 1,
    active_agents TEXT NOT NULL DEFAULT '[]',
    last_project_path TEXT,
    saved_at TEXT NOT NULL
);

INSERT OR IGNORE INTO app_state_snapshot (id, active_agents, last_project_path, saved_at)
VALUES (1, '[]', NULL, datetime('now'));
