-- 004_backward_channel.sql
-- Backward Channel: Chat Platform Configs
-- Maps chat platforms to ACC projects for bidirectional agent communication

CREATE TABLE IF NOT EXISTS chat_platform_configs (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL,
    platform        TEXT NOT NULL,          -- 'lark', 'slack', 'discord', 'telegram'
    routing_key     TEXT NOT NULL,          -- platform-specific routing identifier
    enabled         INTEGER NOT NULL DEFAULT 1,
    webhook_url     TEXT NOT NULL DEFAULT '',-- deployed webhook server URL
    credentials     TEXT NOT NULL DEFAULT '{}', -- JSON: platform-specific credentials
    queue_provider  TEXT NOT NULL DEFAULT 'upstash', -- 'upstash', 'postgres', 'redis', 'file'
    queue_config    TEXT NOT NULL DEFAULT '{}', -- JSON: provider-specific config
    reply_mode      TEXT NOT NULL DEFAULT 'post_process', -- 'mcp_tool', 'post_process', 'inline'
    status          TEXT NOT NULL DEFAULT 'disconnected', -- 'disconnected', 'connected', 'error', 'configured'
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes: lookup by project + platform
CREATE INDEX IF NOT EXISTS idx_platform_configs_project ON chat_platform_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_platform_configs_enabled ON chat_platform_configs(project_id, enabled);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_configs_routing ON chat_platform_configs(platform, routing_key);
