use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeEntitySearchResult {
    pub id: String,
    pub entity_type: String,
    pub name: String,
    pub qualified_path: Option<String>,
    pub source_file: String,
    pub line_start: Option<i64>,
    pub signature: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeKnowledgeLink {
    pub code_entity_id: String,
    pub entity_name: String,
    pub entity_type: String,
    pub source_file: String,
    pub knowledge_id: String,
    pub knowledge_title: String,
    pub knowledge_type: String,
    pub relation_type: String,
    pub confidence: f64,
}

pub fn find_code_entities_by_name(
    db: &Connection,
    name_query: &str,
    limit: i64,
) -> Result<Vec<CodeEntitySearchResult>, String> {
    let like = format!("%{}%", name_query);
    let mut stmt = db.prepare(
        "SELECT id, entity_type, name, qualified_path, source_file, line_start, signature \
         FROM code_entities \
         WHERE name LIKE ?1 OR qualified_path LIKE ?1 \
         ORDER BY name \
         LIMIT ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![like, limit], |row| {
        Ok(CodeEntitySearchResult {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            name: row.get(2)?,
            qualified_path: row.get(3)?,
            source_file: row.get(4)?,
            line_start: row.get(5)?,
            signature: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn find_code_entities_by_file(
    db: &Connection,
    source_file: &str,
) -> Result<Vec<CodeEntitySearchResult>, String> {
    let mut stmt = db.prepare(
        "SELECT id, entity_type, name, qualified_path, source_file, line_start, signature \
         FROM code_entities WHERE source_file = ?1 ORDER BY line_start"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![source_file], |row| {
        Ok(CodeEntitySearchResult {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            name: row.get(2)?,
            qualified_path: row.get(3)?,
            source_file: row.get(4)?,
            line_start: row.get(5)?,
            signature: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_code_knowledge_links(
    db: &Connection,
    code_entity_id: &str,
) -> Result<Vec<CodeKnowledgeLink>, String> {
    let mut stmt = db.prepare(
        "SELECT ck.code_entity_id, ce.name, ce.entity_type, ce.source_file, \
                ck.knowledge_id, k.title, k.type, ck.relation_type, ck.confidence \
         FROM code_to_knowledge ck \
         JOIN code_entities ce ON ce.id = ck.code_entity_id \
         JOIN knowledge_items k ON k.id = ck.knowledge_id \
         WHERE ck.code_entity_id = ?1 \
         ORDER BY ck.confidence DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![code_entity_id], |row| {
        Ok(CodeKnowledgeLink {
            code_entity_id: row.get(0)?,
            entity_name: row.get(1)?,
            entity_type: row.get(2)?,
            source_file: row.get(3)?,
            knowledge_id: row.get(4)?,
            knowledge_title: row.get(5)?,
            knowledge_type: row.get(6)?,
            relation_type: row.get(7)?,
            confidence: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn get_project_code_entity_stats(
    db: &Connection,
    project_id: &str,
) -> Result<serde_json::Value, String> {
    let total: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM code_entities WHERE project_id = ?1",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT entity_type, COUNT(*) as cnt FROM code_entities WHERE project_id = ?1 GROUP BY entity_type"
        )
        .map_err(|e| e.to_string())?;

    let by_type: Vec<serde_json::Value> = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(serde_json::json!({
                "type": row.get::<_, String>(0)?,
                "count": row.get::<_, i64>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let linked: i64 = db
        .query_row(
            "SELECT COUNT(DISTINCT code_entity_id) FROM code_to_knowledge ck JOIN code_entities ce ON ce.id = ck.code_entity_id WHERE ce.project_id = ?1",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "total": total,
        "by_type": by_type,
        "linked_to_knowledge": linked,
    }))
}
