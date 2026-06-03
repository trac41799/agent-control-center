CREATE TABLE IF NOT EXISTS control_sessions (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  plan_id TEXT,
  panel_id TEXT NOT NULL,
  state TEXT DEFAULT 'promoted',
  docs_dir TEXT NOT NULL,
  started_at TEXT NOT NULL,
  paused_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_control_sessions_thread ON control_sessions(thread_id);
CREATE INDEX IF NOT EXISTS idx_control_sessions_state ON control_sessions(state);
