-- Knowledge Graph Evolution: embeddings, temporal, provenance, communities, contradictions, code bridge, git co-change

ALTER TABLE knowledge_items ADD COLUMN embedding BLOB;
ALTER TABLE knowledge_items ADD COLUMN canonical_name TEXT;
ALTER TABLE knowledge_items ADD COLUMN valid_from TEXT;
ALTER TABLE knowledge_items ADD COLUMN valid_until TEXT;
ALTER TABLE knowledge_items ADD COLUMN applicable_versions TEXT;
ALTER TABLE knowledge_items ADD COLUMN superseded_by TEXT;
ALTER TABLE knowledge_items ADD COLUMN context_tags TEXT;

CREATE TABLE IF NOT EXISTS knowledge_provenance (
    item_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    source_type   TEXT NOT NULL,
    source_id     TEXT NOT NULL,
    excerpt       TEXT,
    attributed_at TEXT NOT NULL,
    confidence_contribution REAL DEFAULT 1.0,
    PRIMARY KEY (item_id, source_id)
);

CREATE TABLE IF NOT EXISTS knowledge_communities (
    item_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    community_id  TEXT NOT NULL,
    level         INTEGER NOT NULL DEFAULT 0,
    assigned_at   TEXT NOT NULL,
    PRIMARY KEY (item_id, level)
);
CREATE INDEX IF NOT EXISTS idx_kg_communities_cid ON knowledge_communities(community_id);

CREATE TABLE IF NOT EXISTS community_summaries (
    community_id  TEXT PRIMARY KEY,
    level         INTEGER NOT NULL,
    title         TEXT NOT NULL,
    summary       TEXT NOT NULL,
    item_count    INTEGER DEFAULT 0,
    embedding     BLOB,
    generated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_contradictions (
    id              TEXT PRIMARY KEY,
    item_a_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    item_b_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    conflict_type   TEXT,
    description     TEXT,
    resolution      TEXT DEFAULT 'unresolved',
    resolved_by     TEXT,
    resolved_at     TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kg_contradictions_unresolved ON knowledge_contradictions(resolution) WHERE resolution = 'unresolved';

CREATE TABLE IF NOT EXISTS code_entities (
    id              TEXT PRIMARY KEY,
    project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL,
    name            TEXT NOT NULL,
    qualified_path  TEXT,
    language        TEXT,
    source_file     TEXT NOT NULL,
    line_start      INTEGER,
    line_end        INTEGER,
    signature       TEXT,
    embedding       BLOB,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_code_entities_project ON code_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_code_entities_file ON code_entities(source_file);

CREATE TABLE IF NOT EXISTS code_to_knowledge (
    code_entity_id  TEXT REFERENCES code_entities(id) ON DELETE CASCADE,
    knowledge_id    TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL,
    confidence      REAL DEFAULT 1.0,
    created_at      TEXT NOT NULL,
    PRIMARY KEY (code_entity_id, knowledge_id, relation_type)
);
CREATE INDEX IF NOT EXISTS idx_ctk_knowledge ON code_to_knowledge(knowledge_id);

CREATE TABLE IF NOT EXISTS git_cochange_relations (
    file_a          TEXT NOT NULL,
    file_b          TEXT NOT NULL,
    project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
    jaccard_score   REAL NOT NULL,
    cochange_count  INTEGER NOT NULL,
    last_observed   TEXT NOT NULL,
    PRIMARY KEY (file_a, file_b, project_id)
);
CREATE INDEX IF NOT EXISTS idx_git_cochange_project ON git_cochange_relations(project_id);
