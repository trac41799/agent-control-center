use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItem {
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeRelation {
    pub from_id: String,
    pub to_id: String,
    pub relation_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeQuery {
    pub q: Option<String>,
    pub stack: Option<String>,
    pub agent: Option<String>,
    pub project_id: Option<String>,
    pub r#type: Option<String>,
    pub status: Option<String>,
    pub min_confidence: Option<f64>,
    pub is_global: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItemInput {
    pub r#type: String,
    pub title: String,
    pub content: String,
    pub tags: Option<String>,
    pub stack_tags: Option<String>,
    pub agent_tags: Option<String>,
    pub project_id: Option<String>,
    pub session_ids: Option<String>,
    pub plan_ids: Option<String>,
    pub is_global: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeItemUpdate {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<String>,
    pub stack_tags: Option<String>,
    pub agent_tags: Option<String>,
    pub confidence: Option<f64>,
    pub status: Option<String>,
}

fn row_to_knowledge_item(row: &rusqlite::Row) -> rusqlite::Result<KnowledgeItem> {
    Ok(KnowledgeItem {
        id: row.get(0)?,
        r#type: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        tags: row.get(4)?,
        stack_tags: row.get(5)?,
        agent_tags: row.get(6)?,
        project_id: row.get(7)?,
        session_ids: row.get(8)?,
        plan_ids: row.get(9)?,
        confidence: row.get(10)?,
        confirmation_count: row.get(11)?,
        is_global: row.get::<_, i64>(12)? == 1,
        first_seen: row.get(13)?,
        last_confirmed: row.get(14)?,
        status: row.get(15)?,
        pending_task_data: row.get(16)?,
    })
}

pub fn create_knowledge_item(
    db: &Connection,
    item: &KnowledgeItemInput,
) -> Result<KnowledgeItem, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO knowledge_items (id, type, title, content, tags, stack_tags, agent_tags, project_id, session_ids, plan_ids, confidence, confirmation_count, is_global, first_seen, last_confirmed, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0.5, 1, ?11, ?12, ?12, 'active')",
        rusqlite::params![
            id,
            item.r#type,
            item.title,
            item.content,
            item.tags,
            item.stack_tags,
            item.agent_tags,
            item.project_id,
            item.session_ids,
            item.plan_ids,
            item.is_global as i64,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(KnowledgeItem {
        id,
        r#type: item.r#type.clone(),
        title: item.title.clone(),
        content: item.content.clone(),
        tags: item.tags.clone(),
        stack_tags: item.stack_tags.clone(),
        agent_tags: item.agent_tags.clone(),
        project_id: item.project_id.clone(),
        session_ids: item.session_ids.clone(),
        plan_ids: item.plan_ids.clone(),
        confidence: 0.5,
        confirmation_count: 1,
        is_global: item.is_global,
        first_seen: now.clone(),
        last_confirmed: now,
        status: "active".to_string(),
        pending_task_data: None,
    })
}

pub fn get_knowledge_items(
    db: &Connection,
    query: &KnowledgeQuery,
) -> Result<Vec<KnowledgeItem>, String> {
    let mut conditions: Vec<String> = Vec::new();

    if let Some(ref stack) = query.stack {
        conditions.push(format!("stack_tags LIKE '%{}%'", stack));
    }
    if let Some(ref agent) = query.agent {
        conditions.push(format!("agent_tags LIKE '%{}%'", agent));
    }
    if let Some(ref pid) = query.project_id {
        conditions.push(format!("project_id = '{}'", pid));
    }
    if let Some(ref t) = query.r#type {
        conditions.push(format!("type = '{}'", t));
    }
    if let Some(ref s) = query.status {
        conditions.push(format!("status = '{}'", s));
    }
    if let Some(min_conf) = query.min_confidence {
        conditions.push(format!("confidence >= {}", min_conf));
    }
    if let Some(global) = query.is_global {
        conditions.push(format!("is_global = {}", global as i64));
    }
    if let Some(ref q) = query.q {
        conditions.push(format!(
            "(title LIKE '%{}%' OR content LIKE '%{}%' OR tags LIKE '%{}%')",
            q, q, q
        ));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let limit = query.limit.unwrap_or(100);
    let offset = query.offset.unwrap_or(0);

    let sql = format!(
        "SELECT id, type, title, content, tags, stack_tags, agent_tags, project_id, session_ids, plan_ids, confidence, confirmation_count, is_global, first_seen, last_confirmed, status, pending_task_data FROM knowledge_items {} ORDER BY last_confirmed DESC LIMIT {} OFFSET {}",
        where_clause, limit, offset
    );

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let items = stmt
        .query_map([], row_to_knowledge_item)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}

pub fn update_knowledge_item(
    db: &Connection,
    id: &str,
    updates: &KnowledgeItemUpdate,
) -> Result<KnowledgeItem, String> {
    let now = Utc::now().to_rfc3339();
    let mut sets: Vec<String> = Vec::new();

    if updates.title.is_some() {
        sets.push(format!("title = '{}'", updates.title.as_ref().unwrap()));
    }
    if updates.content.is_some() {
        sets.push(format!(
            "content = '{}'",
            updates.content.as_ref().unwrap()
        ));
    }
    if updates.tags.is_some() {
        sets.push(format!("tags = '{}'", updates.tags.as_ref().unwrap()));
    }
    if updates.stack_tags.is_some() {
        sets.push(format!(
            "stack_tags = '{}'",
            updates.stack_tags.as_ref().unwrap()
        ));
    }
    if updates.agent_tags.is_some() {
        sets.push(format!(
            "agent_tags = '{}'",
            updates.agent_tags.as_ref().unwrap()
        ));
    }
    if let Some(c) = updates.confidence {
        sets.push(format!("confidence = {}", c));
    }
    if let Some(ref s) = updates.status {
        sets.push(format!("status = '{}'", s));
    }
    sets.push(format!("last_confirmed = '{}'", now));

    if !sets.is_empty() {
        let sql = format!(
            "UPDATE knowledge_items SET {} WHERE id = '{}'",
            sets.join(", "),
            id
        );
        db.execute(&sql, []).map_err(|e| e.to_string())?;
    }

    db.query_row(
        "SELECT id, type, title, content, tags, stack_tags, agent_tags, project_id, session_ids, plan_ids, confidence, confirmation_count, is_global, first_seen, last_confirmed, status, pending_task_data FROM knowledge_items WHERE id = ?1",
        rusqlite::params![id],
        row_to_knowledge_item,
    )
    .map_err(|e| e.to_string())
}

pub fn delete_knowledge_item(db: &Connection, id: &str) -> Result<(), String> {
    db.execute(
        "DELETE FROM knowledge_relations WHERE from_id = ?1 OR to_id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "DELETE FROM knowledge_items WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn compound_knowledge(
    db: &Connection,
    project_id: Option<&str>,
) -> Result<Vec<KnowledgeItem>, String> {
    let where_clause = if let Some(pid) = project_id {
        format!("WHERE project_id = '{}'", pid)
    } else {
        String::new()
    };

    let sql = format!(
        "SELECT id, type, title, content, tags, stack_tags, agent_tags, project_id, session_ids, plan_ids, confidence, confirmation_count, is_global, first_seen, last_confirmed, status, pending_task_data FROM knowledge_items {} ORDER BY type, title",
        where_clause
    );

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let items: Vec<KnowledgeItem> = stmt
        .query_map([], row_to_knowledge_item)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut merged = Vec::new();
    let mut i = 0;
    while i < items.len() {
        let current = &items[i];
        let mut combined_content = current.content.clone();
        let mut total_confirmations = current.confirmation_count;
        let mut weighted_confidence = current.confidence * current.confirmation_count as f64;
        let mut j = i + 1;

        while j < items.len() {
            let next = &items[j];
            if next.r#type == current.r#type {
                let kw_current: Vec<&str> = current
                    .title
                    .split_whitespace()
                    .filter(|w| w.len() > 3)
                    .collect();
                let kw_next: Vec<&str> = next
                    .title
                    .split_whitespace()
                    .filter(|w| w.len() > 3)
                    .collect();
                let shared = kw_current.iter().filter(|k| kw_next.contains(k)).count();

                if shared > 0 {
                    combined_content = format!("{}\n---\n{}", combined_content, next.content);
                    total_confirmations += next.confirmation_count;
                    weighted_confidence += next.confidence * next.confirmation_count as f64;

                    let _ = db.execute(
                        "DELETE FROM knowledge_items WHERE id = ?1",
                        rusqlite::params![next.id],
                    );
                    j += 1;
                    continue;
                }
            }
            break;
        }

        let new_confidence = if total_confirmations > 0 {
            let base = weighted_confidence / total_confirmations as f64;
            let recency = Utc::now()
                .signed_duration_since(
                    current
                        .last_confirmed
                        .parse::<chrono::DateTime<Utc>>()
                        .unwrap_or_else(|_| Utc::now()),
                )
                .num_seconds() as f64;
            let recency_factor = 1.0 + (1.0 / (1.0 + (recency / 3600.0).exp()));
            (base * 0.7 + current.confidence * 0.3 * recency_factor).min(1.0)
        } else {
            current.confidence
        };

        let now = Utc::now().to_rfc3339();
        if j > i + 1 {
            db.execute(
                "UPDATE knowledge_items SET content = ?1, confidence = ?2, confirmation_count = ?3, last_confirmed = ?4 WHERE id = ?5",
                rusqlite::params![combined_content, new_confidence, total_confirmations, now, current.id],
            )
            .map_err(|e| e.to_string())?;
        }

        let mut item = current.clone();
        if j > i + 1 {
            item.content = combined_content;
            item.confidence = new_confidence;
            item.confirmation_count = total_confirmations;
            item.last_confirmed = now;
        }
        merged.push(item);
        i = j;
    }

    Ok(merged)
}

pub fn add_knowledge_relation(
    db: &Connection,
    from_id: &str,
    to_id: &str,
    relation_type: &str,
) -> Result<KnowledgeRelation, String> {
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT OR REPLACE INTO knowledge_relations (from_id, to_id, relation_type, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![from_id, to_id, relation_type, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(KnowledgeRelation {
        from_id: from_id.to_string(),
        to_id: to_id.to_string(),
        relation_type: relation_type.to_string(),
        created_at: now,
    })
}

pub fn get_knowledge_relations(
    db: &Connection,
    from_id: &str,
) -> Result<Vec<KnowledgeRelation>, String> {
    let mut stmt = db
        .prepare(
            "SELECT from_id, to_id, relation_type, created_at FROM knowledge_relations WHERE from_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let relations = stmt
        .query_map(rusqlite::params![from_id], |row| {
            Ok(KnowledgeRelation {
                from_id: row.get(0)?,
                to_id: row.get(1)?,
                relation_type: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(relations)
}

pub fn search_knowledge(
    db: &Connection,
    q: &str,
    limit: i64,
) -> Result<Vec<KnowledgeItem>, String> {
    let query = KnowledgeQuery {
        q: Some(q.to_string()),
        stack: None,
        agent: None,
        project_id: None,
        r#type: None,
        status: None,
        min_confidence: None,
        is_global: None,
        limit: Some(limit),
        offset: Some(0),
    };
    get_knowledge_items(db, &query)
}

pub fn get_knowledge_stats(
    db: &Connection,
    project_id: Option<&str>,
) -> Result<serde_json::Value, String> {
    let where_clause = if let Some(pid) = project_id {
        format!("WHERE project_id = '{}'", pid)
    } else {
        String::new()
    };

    let total: i64 = db
        .query_row(
            &format!(
                "SELECT COUNT(*) FROM knowledge_items {}",
                where_clause
            ),
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let avg_conf: Option<f64> = db
        .query_row(
            &format!(
                "SELECT AVG(confidence) FROM knowledge_items {}",
                where_clause
            ),
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(&format!(
            "SELECT type, COUNT(*) as cnt FROM knowledge_items {} GROUP BY type",
            where_clause
        ))
        .map_err(|e| e.to_string())?;

    let by_type: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "type": row.get::<_, String>(0)?,
                "count": row.get::<_, i64>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut stmt2 = db
        .prepare(&format!(
            "SELECT status, COUNT(*) as cnt FROM knowledge_items {} GROUP BY status",
            where_clause
        ))
        .map_err(|e| e.to_string())?;

    let by_status: Vec<serde_json::Value> = stmt2
        .query_map([], |row| {
            Ok(serde_json::json!({
                "status": row.get::<_, String>(0)?,
                "count": row.get::<_, i64>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut stmt3 = db
        .prepare(&format!(
            "SELECT stack_tags, COUNT(*) as cnt FROM knowledge_items {} AND stack_tags IS NOT NULL GROUP BY stack_tags",
            if where_clause.is_empty() {
                "WHERE".to_string()
            } else {
                format!("{} AND", where_clause)
            }
        ))
        .map_err(|e| e.to_string())?;

    let by_stack: Vec<serde_json::Value> = stmt3
        .query_map([], |row| {
            Ok(serde_json::json!({
                "stack": row.get::<_, String>(0)?,
                "count": row.get::<_, i64>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "total": total,
        "avg_confidence": avg_conf.unwrap_or(0.0),
        "by_type": by_type,
        "by_status": by_status,
        "by_stack": by_stack,
    }))
}
