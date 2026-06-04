use rusqlite::Connection;
use serde::{Deserialize, Serialize};

// ============================================================================
// GraphRAG Query Results
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub title: String,
    pub r#type: String,
    pub confidence: f64,
    pub depth: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub from_id: String,
    pub to_id: String,
    pub relation_type: String,
    pub depth: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubgraphResult {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommunitySearchResult {
    pub community_id: String,
    pub title: String,
    pub summary: String,
    pub level: i64,
    pub item_count: i64,
    pub member_items: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiHopResult {
    pub target_id: String,
    pub title: String,
    pub content: String,
    pub depth: i64,
    pub path: String,
}

// ============================================================================
// BFS Subgraph Expansion (local search)
// ============================================================================

pub fn bfs_subgraph(
    db: &Connection,
    seed_ids: &[String],
    max_depth: i64,
) -> Result<SubgraphResult, String> {
    let mut all_ids: std::collections::HashSet<String> = seed_ids.iter().cloned().collect();
    let mut current_ids: Vec<String> = seed_ids.to_vec();
    let mut edges: Vec<GraphEdge> = Vec::new();
    let mut depth = 0;

    while depth < max_depth && !current_ids.is_empty() {
        let placeholders: Vec<String> = current_ids
            .iter()
            .enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect();
        let sql = format!(
            "SELECT from_id, to_id, relation_type FROM knowledge_relations WHERE from_id IN ({}) UNION SELECT from_id, to_id, relation_type FROM knowledge_relations WHERE to_id IN ({})",
            placeholders.join(","),
            placeholders.join(","),
        );

        let mut ids_for_sql: Vec<&dyn rusqlite::types::ToSql> =
            current_ids.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
        let ids_copy = current_ids.clone();
        ids_for_sql.extend(ids_copy.iter().map(|s| s as &dyn rusqlite::types::ToSql));

        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(
                rusqlite::params_from_iter(ids_for_sql.iter().map(|p| *p)),
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                },
            )
            .map_err(|e| e.to_string())?;

        let mut next_ids: Vec<String> = Vec::new();
        for row in rows {
            let (from_id, to_id, rel_type) = row.map_err(|e| e.to_string())?;
            let edge = GraphEdge {
                from_id: from_id.clone(),
                to_id: to_id.clone(),
                relation_type: rel_type,
                depth: depth + 1,
            };
            if !edges.iter().any(|e| e.from_id == edge.from_id && e.to_id == edge.to_id) {
                edges.push(edge);
            }
            for id in [from_id, to_id] {
                if all_ids.insert(id.clone()) {
                    next_ids.push(id);
                }
            }
        }
        current_ids = next_ids;
        depth += 1;
    }

    let mut nodes = Vec::new();
    for id in &all_ids {
        let mut stmt = db
            .prepare("SELECT id, title, type, confidence FROM knowledge_items WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let node = stmt
            .query_map(rusqlite::params![id], |row| {
                Ok(GraphNode {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    r#type: row.get(2)?,
                    confidence: row.get(3)?,
                    depth: 0,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .next();
        if let Some(n) = node {
            nodes.push(n);
        }
    }

    Ok(SubgraphResult { nodes, edges })
}

// ============================================================================
// Multi-Hop CTE Query (recursive)
// ============================================================================

pub fn multi_hop_query(
    db: &Connection,
    seed_type: &str,
    target_type: &str,
    max_depth: i64,
) -> Result<Vec<MultiHopResult>, String> {
    let sql = format!(
        "WITH RECURSIVE traverse(id, target_id, relation_type, depth, path) AS (\
         SELECT from_id, to_id, relation_type, 1, from_id || '->' || to_id \
         FROM knowledge_relations \
         WHERE from_id IN (SELECT id FROM knowledge_items WHERE type = ?1) \
         UNION ALL \
         SELECT r.from_id, r.to_id, r.relation_type, t.depth + 1, \
         t.path || '->' || r.to_id \
         FROM knowledge_relations r \
         JOIN traverse t ON r.from_id = t.to_id \
         WHERE t.depth < ?2 \
         ) \
         SELECT DISTINCT t.target_id, k.title, k.content, t.depth, t.path \
         FROM traverse t \
         JOIN knowledge_items k ON k.id = t.target_id \
         WHERE k.type = ?3 \
         ORDER BY t.depth"
    );
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![seed_type, max_depth, target_type], |row| {
            Ok(MultiHopResult {
                target_id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                depth: row.get(3)?,
                path: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ============================================================================
// Global Search (community-based)
// ============================================================================

pub fn global_search(
    db: &Connection,
    _query_embedding: Option<&[u8]>,
    limit: i64,
) -> Result<Vec<CommunitySearchResult>, String> {
    let mut stmt = db.prepare(
        "SELECT cs.community_id, cs.level, cs.title, cs.summary, cs.item_count \
         FROM community_summaries cs \
         ORDER BY cs.item_count DESC \
         LIMIT ?1"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(rusqlite::params![limit], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, i64>(4)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        let (community_id, level, title, summary, item_count) = row.map_err(|e| e.to_string())?;

        let mut member_stmt = db.prepare(
            "SELECT ki.id, ki.title, ki.type, ki.confidence \
             FROM knowledge_communities kc \
             JOIN knowledge_items ki ON ki.id = kc.item_id \
             WHERE kc.community_id = ?1 AND kc.level = ?2 \
             ORDER BY ki.confidence DESC \
             LIMIT 5"
        ).map_err(|e| e.to_string())?;

        let members: Vec<serde_json::Value> = member_stmt
            .query_map(rusqlite::params![community_id, level], |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "title": row.get::<_, String>(1)?,
                    "type": row.get::<_, String>(2)?,
                    "confidence": row.get::<_, f64>(3)?,
                }))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        results.push(CommunitySearchResult {
            community_id,
            title,
            summary,
            level,
            item_count,
            member_items: members,
        });
    }

    if !results.is_empty() {
        return Ok(results);
    }

    get_all_items_as_communities(db, limit)
}

fn get_all_items_as_communities(
    db: &Connection,
    limit: i64,
) -> Result<Vec<CommunitySearchResult>, String> {
    let mut stmt = db.prepare(
        "SELECT id, title, type, confidence FROM knowledge_items WHERE status = 'active' ORDER BY confidence DESC LIMIT ?1"
    ).map_err(|e| e.to_string())?;

    let items: Vec<serde_json::Value> = stmt
        .query_map(rusqlite::params![limit], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "type": row.get::<_, String>(2)?,
                "confidence": row.get::<_, f64>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    if items.is_empty() {
        return Ok(vec![]);
    }

    Ok(vec![CommunitySearchResult {
        community_id: "all".to_string(),
        title: "All Knowledge Items".to_string(),
        summary: "No communities have been computed yet. Showing top knowledge items.".to_string(),
        level: 0,
        item_count: items.len() as i64,
        member_items: items,
    }])
}
