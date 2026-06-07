-- 014: Bagua semantic tagging for knowledge graph v2
ALTER TABLE knowledge_items ADD COLUMN coefficients TEXT;
ALTER TABLE knowledge_items ADD COLUMN dominant_trigram TEXT;
ALTER TABLE knowledge_items ADD COLUMN dominant_role TEXT;
ALTER TABLE knowledge_relations ADD COLUMN trigram_tag TEXT;
ALTER TABLE knowledge_relations ADD COLUMN hexagram_tag TEXT;
ALTER TABLE knowledge_relations ADD COLUMN wuxing_cycle TEXT;
ALTER TABLE knowledge_relations ADD COLUMN bagua_confidence REAL DEFAULT 0.0;
ALTER TABLE knowledge_relations ADD COLUMN relation_multivector BLOB;
