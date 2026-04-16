/**
 * 双向链接引用管理模块
 *
 * 处理文档和块的引用存储、查询
 */

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::command;
use std::path::PathBuf;

// 全局数据库连接
static DB_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

// 引用类型
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ref {
    pub id: String,
    pub def_block_id: String,       // 被引用的块/文档 ID
    pub def_block_root_id: String,  // 被引用块的根文档 ID
    pub block_id: String,           // 引用块 ID
    pub root_id: String,            // 源文档 ID
    pub content: String,            // 引用文本
    pub alias: Option<String>,      // 别名
    pub link_type: String,          // 'doc' | 'block' | 'embed'
    pub created_at: i64,
    pub updated_at: i64,
}

// 反链
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Backlink {
    pub block_id: String,
    pub root_id: String,
    pub root_title: String,
    pub content: String,
    pub context: String,
    pub link_type: String,
    pub position: i32,
}

// 链接统计
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LinkStats {
    pub forward_count: i32,
    pub backlink_count: i32,
    pub total_count: i32,
}

// 初始化数据库
pub fn init_db(app_data_dir: PathBuf) -> Result<(), String> {
    let db_path = app_data_dir.join("refs.db");

    let mut db_path_lock = DB_PATH.lock().map_err(|e| e.to_string())?;
    *db_path_lock = Some(db_path.clone());

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // 创建引用表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS refs (
            id TEXT PRIMARY KEY,
            def_block_id TEXT NOT NULL,
            def_block_root_id TEXT,
            block_id TEXT NOT NULL,
            root_id TEXT NOT NULL,
            content TEXT,
            alias TEXT,
            link_type TEXT DEFAULT 'doc',
            created_at INTEGER,
            updated_at INTEGER
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 创建索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_refs_def_block_id ON refs(def_block_id)",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_refs_block_id ON refs(block_id)",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_refs_root_id ON refs(root_id)",
        [],
    ).map_err(|e| e.to_string())?;

    // 创建被引用次数表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS defs (
            id TEXT PRIMARY KEY,
            ref_count INTEGER DEFAULT 0,
            updated_at INTEGER
        )",
        [],
    ).map_err(|e| e.to_string())?;

    println!("[Refs] Database initialized at {:?}", db_path);
    Ok(())
}

fn get_db_path() -> Result<PathBuf, String> {
    let db_path_lock = DB_PATH.lock().map_err(|e| e.to_string())?;
    db_path_lock.clone().ok_or_else(|| "Database not initialized".to_string())
}

fn with_db<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String>,
{
    let db_path = get_db_path()?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    f(&conn)
}

// ==================== Tauri 命令 ====================

#[command]
pub fn save_doc_refs(
    doc_id: String,
    doc_title: String,
    content: String,
) -> Result<(), String> {
    // 解析内容中的引用
    let refs = parse_refs_from_content(&content, &doc_id);

    with_db(|conn| {
        // 删除旧的引用
        conn.execute("DELETE FROM refs WHERE root_id = ?1", params![doc_id])?;

        let now = chrono::Utc::now().timestamp_millis();

        // 插入新引用
        for (idx, r) in refs.iter().enumerate() {
            let id = format!("{}-{}-{}", doc_id, r.link_type, idx);

            conn.execute(
                "INSERT OR REPLACE INTO refs
                (id, def_block_id, def_block_root_id, block_id, root_id, content, alias, link_type, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    id,
                    r.def_block_id,
                    r.def_block_root_id,
                    r.block_id,
                    doc_id,
                    r.content,
                    r.alias,
                    r.link_type,
                    now,
                    now
                ],
            )?;

            // 更新被引用次数
            conn.execute(
                "INSERT INTO defs (id, ref_count, updated_at)
                VALUES (?1, 1, ?2)
                ON CONFLICT(id) DO UPDATE SET ref_count = ref_count + 1, updated_at = ?2",
                params![r.def_block_id, now],
            )?;
        }

        Ok(())
    })
}

#[command]
pub fn get_forward_links(doc_id: String) -> Result<Vec<Ref>, String> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, def_block_id, def_block_root_id, block_id, root_id, content, alias, link_type, created_at, updated_at
            FROM refs WHERE root_id = ?1"
        )?;

        let refs = stmt.query_map(params![doc_id], |row| {
            Ok(Ref {
                id: row.get(0)?,
                def_block_id: row.get(1)?,
                def_block_root_id: row.get(2)?,
                block_id: row.get(3)?,
                root_id: row.get(4)?,
                content: row.get(5)?,
                alias: row.get(6)?,
                link_type: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

        Ok(refs)
    })
}

#[command]
pub fn get_backlinks(doc_id: String) -> Result<Vec<Backlink>, String> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT r.block_id, r.root_id, r.content, r.link_type
            FROM refs r
            WHERE r.def_block_id = ?1 OR r.content = ?1"
        )?;

        let backlinks: Vec<Backlink> = stmt.query_map(params![doc_id], |row| {
            let root_id: String = row.get(1)?;
            Ok(Backlink {
                block_id: row.get(0)?,
                root_id: root_id.clone(),
                root_title: get_doc_title(conn, &root_id).unwrap_or_else(|| "未知文档".to_string()),
                content: row.get(2)?,
                context: "".to_string(), // 简化：需要查询原始内容
                link_type: row.get(3)?,
                position: 0,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

        Ok(backlinks)
    })
}

fn get_doc_title(conn: &Connection, doc_id: &str) -> Option<String> {
    // 这里简化处理，实际需要从文档存储中获取标题
    // 可以通过查询 docs 表或其他文档元数据
    None
}

#[command]
pub fn get_link_stats(doc_id: String) -> Result<LinkStats, String> {
    let forward = get_forward_links(doc_id.clone())?;
    let backlink = get_backlinks(doc_id)?;

    Ok(LinkStats {
        forward_count: forward.len() as i32,
        backlink_count: backlink.len() as i32,
        total_count: (forward.len() + backlink.len()) as i32,
    })
}

#[command]
pub fn search_refs(query: String, limit: i32) -> Result<Vec<serde_json::Value>, String> {
    with_db(|conn| {
        let search_pattern = format!("%{}%", query);

        let mut stmt = conn.prepare(
            "SELECT DISTINCT r.def_block_id, r.content, r.link_type
            FROM refs r
            WHERE r.content LIKE ?1 OR r.alias LIKE ?1
            LIMIT ?2"
        )?;

        let results: Vec<serde_json::Value> = stmt.query_map(params![search_pattern, limit], |row| {
            let link_type: String = row.get(2)?;
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "type": if link_type == "block" { "block" } else { "doc" },
                "preview": row.get::<_, String>(1)?
            }))
        })?
        .filter_map(|r| r.ok())
        .collect();

        Ok(results)
    })
}

// ==================== 引用解析 ====================

#[derive(Debug, Clone)]
struct ParsedRef {
    def_block_id: String,
    def_block_root_id: String,
    block_id: String,
    content: String,
    alias: Option<String>,
    link_type: String,
}

fn parse_refs_from_content(content: &str, doc_id: &str) -> Vec<ParsedRef> {
    let mut refs = Vec::new();

    // 解析文档引用 [[name]] 或 [[name|alias]]
    let doc_regex = regex::Regex::new(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap();
    for cap in doc_regex.captures_iter(content) {
        let name = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        let alias = cap.get(2).map(|m| Some(m.as_str().to_string())).unwrap_or(None);

        refs.push(ParsedRef {
            def_block_id: name.to_string(),
            def_block_root_id: name.to_string(),
            block_id: doc_id.to_string(),
            content: name.to_string(),
            alias,
            link_type: "doc".to_string(),
        });
    }

    // 解析块引用 ((id)) 或 ((id*alias))
    let block_regex = regex::Regex::new(r"\(\(([^)]+)\)\)").unwrap();
    for cap in block_regex.captures_iter(content) {
        let content_match = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        let parts: Vec<&str> = content_match.split('*').collect();
        let id = parts.get(0).map(|s| s.trim()).unwrap_or("");
        let alias = if parts.len() > 1 {
            Some(parts[1..].join("*").trim().to_string())
        } else {
            None
        };

        refs.push(ParsedRef {
            def_block_id: id.to_string(),
            def_block_root_id: doc_id.to_string(),
            block_id: doc_id.to_string(),
            content: id.to_string(),
            alias,
            link_type: "block".to_string(),
        });
    }

    // 解析嵌入块 {{(id)}}
    let embed_regex = regex::Regex::new(r"\{\{\(([^)]+)\)\}\}").unwrap();
    for cap in embed_regex.captures_iter(content) {
        let block_id = cap.get(1).map(|m| m.as_str()).unwrap_or("");

        refs.push(ParsedRef {
            def_block_id: block_id.to_string(),
            def_block_root_id: doc_id.to_string(),
            block_id: doc_id.to_string(),
            content: block_id.to_string(),
            alias: None,
            link_type: "embed".to_string(),
        });
    }

    refs
}