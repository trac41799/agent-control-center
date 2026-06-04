use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// Enhanced KnowledgeItem (extended fields)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItemExtended {
    pub id: String,
    pub r#type: String,
    pub title: String,
    pub content: String,
    pub tags: Option<String>,
    pub stack_tags: Option<String>,
    pub agent_tags: Option<String>,
    pub project_id: Option<String>,
    pub session_ids: Option<String>,
    pub plan_ids: Option<String>,
    pub confidence: f64,
    pub confirmation_count: i64,
    pub is_global: bool,
    pub first_seen: String,
    pub last_confirmed: String,
    pub status: String,
    pub pending_task_data: Option<String>,
    pub embedding: Option<Vec<u8>>,
    pub canonical_name: Option<String>,
    pub valid_from: Option<String>,
    pub valid_until: Option<String>,
    pub applicable_versions: Option<String>,
    pub superseded_by: Option<String>,
    pub context_tags: Option<String>,
}

// ============================================================================
// Knowledge Provenance
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeProvenance {
    pub item_id: String,
    pub source_type: String,
    pub source_id: String,
    pub excerpt: Option<String>,
    pub attributed_at: String,
    pub confidence_contribution: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeProvenanceInput {
    pub source_type: String,
    pub source_id: String,
    pub excerpt: Option<String>,
    pub confidence_contribution: Option<f64>,
}

pub fn add_knowledge_provenance(
    db: &Connection,
    item_id: &str,
    input: &KnowledgeProvenanceInput,
) -> Result<KnowledgeProvenance, String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT OR REPLACE INTO knowledge_provenance (item_id, source_type, source_id, excerpt, attributed_at, confidence_contribution) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![item_id, input.source_type, input.source_id, input.excerpt, now, input.confidence_contribution.unwrap_or(1.0)],
    ).map_err(|e| e.to_string())?;
    Ok(KnowledgeProvenance {
        item_id: item_id.to_string(),
        source_type: input.source_type.clone(),
        source_id: input.source_id.clone(),
        excerpt: input.excerpt.clone(),
        attributed_at: now,
        confidence_contribution: input.confidence_contribution.unwrap_or(1.0),
    })
}

pub fn get_knowledge_provenance(
    db: &Connection,
    item_id: &str,
) -> Result<Vec<KnowledgeProvenance>, String> {
    let mut stmt = db.prepare(
        "SELECT item_id, source_type, source_id, excerpt, attributed_at, confidence_contribution FROM knowledge_provenance WHERE item_id = ?1 ORDER BY attributed_at DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![item_id], |row| {
        Ok(KnowledgeProvenance {
            item_id: row.get(0)?,
            source_type: row.get(1)?,
            source_id: row.get(2)?,
            excerpt: row.get(3)?,
            attributed_at: row.get(4)?,
            confidence_contribution: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ============================================================================
// Communities
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeCommunity {
    pub item_id: String,
    pub community_id: String,
    pub level: i64,
    pub assigned_at: String,
}

pub fn assign_item_to_community(
    db: &Connection,
    item_id: &str,
    community_id: &str,
    level: i64,
) -> Result<KnowledgeCommunity, String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT OR REPLACE INTO knowledge_communities (item_id, community_id, level, assigned_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![item_id, community_id, level, now],
    ).map_err(|e| e.to_string())?;
    Ok(KnowledgeCommunity {
        item_id: item_id.to_string(),
        community_id: community_id.to_string(),
        level,
        assigned_at: now,
    })
}

pub fn get_community_items(
    db: &Connection,
    community_id: &str,
    level: i64,
) -> Result<Vec<String>, String> {
    let mut stmt = db.prepare(
        "SELECT item_id FROM knowledge_communities WHERE community_id = ?1 AND level = ?2"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![community_id, level], |row| {
        row.get::<_, String>(0)
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ============================================================================
// Community Summaries
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommunitySummary {
    pub community_id: String,
    pub level: i64,
    pub title: String,
    pub summary: String,
    pub item_count: i64,
    pub embedding: Option<Vec<u8>>,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommunitySummaryInput {
    pub title: String,
    pub summary: String,
    pub item_count: i64,
    pub embedding: Option<Vec<u8>>,
}

pub fn upsert_community_summary(
    db: &Connection,
    community_id: &str,
    level: i64,
    input: &CommunitySummaryInput,
) -> Result<CommunitySummary, String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT OR REPLACE INTO community_summaries (community_id, level, title, summary, item_count, embedding, generated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![community_id, level, input.title, input.summary, input.item_count, input.embedding, now],
    ).map_err(|e| e.to_string())?;
    Ok(CommunitySummary {
        community_id: community_id.to_string(),
        level,
        title: input.title.clone(),
        summary: input.summary.clone(),
        item_count: input.item_count,
        embedding: input.embedding.clone(),
        generated_at: now,
    })
}

pub fn get_community_summary(
    db: &Connection,
    community_id: &str,
    level: i64,
) -> Result<Option<CommunitySummary>, String> {
    let mut stmt = db.prepare(
        "SELECT community_id, level, title, summary, item_count, embedding, generated_at FROM community_summaries WHERE community_id = ?1 AND level = ?2"
    ).map_err(|e| e.to_string())?;
    let mut rows = stmt.query_map(rusqlite::params![community_id, level], |row| {
        Ok(CommunitySummary {
            community_id: row.get(0)?,
            level: row.get(1)?,
            title: row.get(2)?,
            summary: row.get(3)?,
            item_count: row.get(4)?,
            embedding: row.get(5)?,
            generated_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.next().transpose().map_err(|e| e.to_string())
}

pub fn list_community_summaries(
    db: &Connection,
    level: i64,
    limit: i64,
) -> Result<Vec<CommunitySummary>, String> {
    let mut stmt = db.prepare(
        "SELECT community_id, level, title, summary, item_count, embedding, generated_at FROM community_summaries WHERE level = ?1 ORDER BY item_count DESC LIMIT ?2"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![level, limit], |row| {
        Ok(CommunitySummary {
            community_id: row.get(0)?,
            level: row.get(1)?,
            title: row.get(2)?,
            summary: row.get(3)?,
            item_count: row.get(4)?,
            embedding: row.get(5)?,
            generated_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ============================================================================
// Contradictions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeContradiction {
    pub id: String,
    pub item_a_id: String,
    pub item_b_id: String,
    pub conflict_type: Option<String>,
    pub description: Option<String>,
    pub resolution: String,
    pub resolved_by: Option<String>,
    pub resolved_at: Option<String>,
    pub created_at: String,
}

pub fn create_contradiction(
    db: &Connection,
    item_a_id: &str,
    item_b_id: &str,
    conflict_type: &str,
    description: &str,
) -> Result<KnowledgeContradiction, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO knowledge_contradictions (id, item_a_id, item_b_id, conflict_type, description, resolution, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 'unresolved', ?6)",
        rusqlite::params![id, item_a_id, item_b_id, conflict_type, description, now],
    ).map_err(|e| e.to_string())?;
    Ok(KnowledgeContradiction {
        id,
        item_a_id: item_a_id.to_string(),
        item_b_id: item_b_id.to_string(),
        conflict_type: Some(conflict_type.to_string()),
        description: Some(description.to_string()),
        resolution: "unresolved".to_string(),
        resolved_by: None,
        resolved_at: None,
        created_at: now,
    })
}

pub fn get_contradictions(
    db: &Connection,
    filter: Option<&str>,
) -> Result<Vec<KnowledgeContradiction>, String> {
    let (where_clause, params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match filter {
        Some("unresolved") => ("WHERE resolution = 'unresolved'".to_string(), vec![]),
        Some("resolved") => ("WHERE resolution != 'unresolved'".to_string(), vec![]),
        _ => (String::new(), vec![]),
    };
    let sql = format!(
        "SELECT id, item_a_id, item_b_id, conflict_type, description, resolution, resolved_by, resolved_at, created_at FROM knowledge_contradictions {} ORDER BY created_at DESC",
        where_clause
    );
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(KnowledgeContradiction {
            id: row.get(0)?,
            item_a_id: row.get(1)?,
            item_b_id: row.get(2)?,
            conflict_type: row.get(3)?,
            description: row.get(4)?,
            resolution: row.get(5)?,
            resolved_by: row.get(6)?,
            resolved_at: row.get(7)?,
            created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn resolve_contradiction(
    db: &Connection,
    id: &str,
    resolution: &str,
    resolved_by: &str,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE knowledge_contradictions SET resolution = ?1, resolved_by = ?2, resolved_at = ?3 WHERE id = ?4",
        rusqlite::params![resolution, resolved_by, now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// Code Entities
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeEntity {
    pub id: String,
    pub project_id: Option<String>,
    pub entity_type: String,
    pub name: String,
    pub qualified_path: Option<String>,
    pub language: Option<String>,
    pub source_file: String,
    pub line_start: Option<i64>,
    pub line_end: Option<i64>,
    pub signature: Option<String>,
    pub embedding: Option<Vec<u8>>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeEntityInput {
    pub project_id: Option<String>,
    pub entity_type: String,
    pub name: String,
    pub qualified_path: Option<String>,
    pub language: Option<String>,
    pub source_file: String,
    pub line_start: Option<i64>,
    pub line_end: Option<i64>,
    pub signature: Option<String>,
}

pub fn create_code_entity(
    db: &Connection,
    input: &CodeEntityInput,
) -> Result<CodeEntity, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO code_entities (id, project_id, entity_type, name, qualified_path, language, source_file, line_start, line_end, signature, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
        rusqlite::params![id, input.project_id, input.entity_type, input.name, input.qualified_path, input.language, input.source_file, input.line_start, input.line_end, input.signature, now],
    ).map_err(|e| e.to_string())?;
    Ok(CodeEntity {
        id,
        project_id: input.project_id.clone(),
        entity_type: input.entity_type.clone(),
        name: input.name.clone(),
        qualified_path: input.qualified_path.clone(),
        language: input.language.clone(),
        source_file: input.source_file.clone(),
        line_start: input.line_start,
        line_end: input.line_end,
        signature: input.signature.clone(),
        embedding: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn get_code_entities_for_file(
    db: &Connection,
    source_file: &str,
) -> Result<Vec<CodeEntity>, String> {
    let mut stmt = db.prepare(
        "SELECT id, project_id, entity_type, name, qualified_path, language, source_file, line_start, line_end, signature, embedding, created_at, updated_at FROM code_entities WHERE source_file = ?1 ORDER BY line_start"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![source_file], |row| {
        Ok(CodeEntity {
            id: row.get(0)?,
            project_id: row.get(1)?,
            entity_type: row.get(2)?,
            name: row.get(3)?,
            qualified_path: row.get(4)?,
            language: row.get(5)?,
            source_file: row.get(6)?,
            line_start: row.get(7)?,
            line_end: row.get(8)?,
            signature: row.get(9)?,
            embedding: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ============================================================================
// Code ↔ Knowledge Bridge
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeToKnowledge {
    pub code_entity_id: String,
    pub knowledge_id: String,
    pub relation_type: String,
    pub confidence: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeKnowledgeJoin {
    pub title: String,
    pub r#type: String,
    pub confidence: f64,
    pub entity_name: String,
    pub qualified_path: Option<String>,
    pub relation_type: String,
}

pub fn link_code_to_knowledge(
    db: &Connection,
    code_entity_id: &str,
    knowledge_id: &str,
    relation_type: &str,
    confidence: f64,
) -> Result<CodeToKnowledge, String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT OR REPLACE INTO code_to_knowledge (code_entity_id, knowledge_id, relation_type, confidence, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![code_entity_id, knowledge_id, relation_type, confidence, now],
    ).map_err(|e| e.to_string())?;
    Ok(CodeToKnowledge {
        code_entity_id: code_entity_id.to_string(),
        knowledge_id: knowledge_id.to_string(),
        relation_type: relation_type.to_string(),
        confidence,
        created_at: now,
    })
}

pub fn get_knowledge_for_code(
    db: &Connection,
    source_file: &str,
) -> Result<Vec<CodeKnowledgeJoin>, String> {
    let mut stmt = db.prepare(
        "SELECT k.title, k.type, k.confidence, ce.name, ce.qualified_path, ck.relation_type FROM code_to_knowledge ck JOIN knowledge_items k ON k.id = ck.knowledge_id JOIN code_entities ce ON ce.id = ck.code_entity_id WHERE ce.source_file = ?1 AND k.status = 'active' ORDER BY k.confidence DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![source_file], |row| {
        Ok(CodeKnowledgeJoin {
            title: row.get(0)?,
            r#type: row.get(1)?,
            confidence: row.get(2)?,
            entity_name: row.get(3)?,
            qualified_path: row.get(4)?,
            relation_type: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ============================================================================
// Git Co-Change Relations
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCochangeRelation {
    pub file_a: String,
    pub file_b: String,
    pub project_id: Option<String>,
    pub jaccard_score: f64,
    pub cochange_count: i64,
    pub last_observed: String,
}

pub fn upsert_git_cochange(
    db: &Connection,
    file_a: &str,
    file_b: &str,
    project_id: Option<&str>,
    jaccard_score: f64,
    cochange_count: i64,
) -> Result<GitCochangeRelation, String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT OR REPLACE INTO git_cochange_relations (file_a, file_b, project_id, jaccard_score, cochange_count, last_observed) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![file_a, file_b, project_id, jaccard_score, cochange_count, now],
    ).map_err(|e| e.to_string())?;
    Ok(GitCochangeRelation {
        file_a: file_a.to_string(),
        file_b: file_b.to_string(),
        project_id: project_id.map(String::from),
        jaccard_score,
        cochange_count,
        last_observed: now,
    })
}

pub fn get_cochanges_for_file(
    db: &Connection,
    file_path: &str,
    min_jaccard: f64,
) -> Result<Vec<GitCochangeRelation>, String> {
    let mut stmt = db.prepare(
        "SELECT file_a, file_b, project_id, jaccard_score, cochange_count, last_observed FROM git_cochange_relations WHERE (file_a = ?1 OR file_b = ?1) AND jaccard_score >= ?2 ORDER BY jaccard_score DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params![file_path, min_jaccard], |row| {
        Ok(GitCochangeRelation {
            file_a: row.get(0)?,
            file_b: row.get(1)?,
            project_id: row.get(2)?,
            jaccard_score: row.get(3)?,
            cochange_count: row.get(4)?,
            last_observed: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ============================================================================
// Multi-Factor Confidence Model
// ============================================================================

pub struct ConfidenceFactors {
    pub source_credibility: f64,
    pub corroboration: f64,
    pub recency: f64,
    pub agent_tier: f64,
}

const ALPHA: f64 = 0.3;
const BETA: f64 = 0.35;
const GAMMA: f64 = 0.2;
const DELTA: f64 = 0.15;

pub fn compute_confidence(factors: &ConfidenceFactors) -> f64 {
    (ALPHA * factors.source_credibility
        + BETA * factors.corroboration
        + GAMMA * factors.recency
        + DELTA * factors.agent_tier)
    .clamp(0.0, 1.0)
}

pub fn source_credibility(source_type: &str) -> f64 {
    match source_type {
        "manual" => 0.95,
        "compounder" => 0.85,
        "agent_claim" => 0.65,
        "heuristic" => 0.40,
        _ => 0.50,
    }
}

pub fn corroboration_score(confirmation_count: i64) -> f64 {
    let max_confirmations = 8.0;
    ((confirmation_count as f64) + 1.0).ln() / (max_confirmations + 1.0)
}

pub fn recency_score(days_since_last_confirmation: f64) -> f64 {
    let lambda = 0.01;
    (-lambda * days_since_last_confirmation).exp()
}

pub fn agent_tier_score(tier: &str) -> f64 {
    match tier {
        "tier1" => 0.9,
        "tier2" => 0.6,
        _ => 0.3,
    }
}

pub fn get_confidence_tier(confidence: f64) -> &'static str {
    if confidence >= 0.6 {
        "high"
    } else if confidence >= 0.3 {
        "medium"
    } else {
        "low"
    }
}
