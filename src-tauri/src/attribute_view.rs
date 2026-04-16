/**
 * 属性视图 (Attribute View) 模块
 *
 * 类似 Siyuan/Notion 的数据库功能
 */

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::command;
use std::path::PathBuf;

// 全局数据库连接
static DB_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

// ==================== 数据结构 ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttributeView {
    pub id: String,
    pub name: String,
    pub workspace_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AVColumn {
    pub id: String,
    pub av_id: String,
    pub name: String,
    pub column_type: String,  // text, number, date, select, multiSelect, checkbox, url, email, phone, relation, rollup, template, asset, created, updated
    pub options: Option<String>,  // JSON string for select/multiSelect options
    pub width: i32,
    pub hidden: bool,
    pub wrap: bool,
    pub icon: Option<String>,
    pub index: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AVView {
    pub id: String,
    pub av_id: String,
    pub name: String,
    pub view_type: String,  // table, gallery, kanban
    pub filters: Option<String>,  // JSON string
    pub sorts: Option<String>,    // JSON string
    pub group_by: Option<String>, // column id
    pub page_size: i32,
    pub icon: Option<String>,
    pub index: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AVRow {
    pub id: String,
    pub av_id: String,
    pub block_id: String,  // 关联的块ID（文档ID）
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AVCell {
    pub id: String,
    pub row_id: String,
    pub column_id: String,
    pub value: String,  // JSON string of value
    pub updated_at: i64,
}

// ==================== 列类型定义 ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SelectOption {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColumnConfig {
    pub number_format: Option<String>,  // decimal, percent, currency
    pub date_format: Option<String>,     // yyyy-MM-dd, etc.
    pub template: Option<String>,
    pub relation_av_id: Option<String>,  // related attribute view
    pub rollup_column_id: Option<String>,
    pub rollup_function: Option<String>, // count, sum, avg, min, max
}

// ==================== 初始化 ====================

pub fn init_av_db(app_data_dir: PathBuf) -> Result<(), String> {
    let db_path = app_data_dir.join("attribute_view.db");

    let mut db_path_lock = DB_PATH.lock().map_err(|e| e.to_string())?;
    *db_path_lock = Some(db_path.clone());

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // 属性视图表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS attribute_views (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            workspace_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 列定义表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS av_columns (
            id TEXT PRIMARY KEY,
            av_id TEXT NOT NULL,
            name TEXT NOT NULL,
            column_type TEXT NOT NULL,
            options TEXT,
            width INTEGER DEFAULT 200,
            hidden INTEGER DEFAULT 0,
            wrap INTEGER DEFAULT 0,
            icon TEXT,
            av_index INTEGER NOT NULL,
            FOREIGN KEY (av_id) REFERENCES attribute_views(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 视图表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS av_views (
            id TEXT PRIMARY KEY,
            av_id TEXT NOT NULL,
            name TEXT NOT NULL,
            view_type TEXT NOT NULL,
            filters TEXT,
            sorts TEXT,
            group_by TEXT,
            page_size INTEGER DEFAULT 20,
            icon TEXT,
            av_index INTEGER NOT NULL,
            FOREIGN KEY (av_id) REFERENCES attribute_views(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 行表（关联到文档）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS av_rows (
            id TEXT PRIMARY KEY,
            av_id TEXT NOT NULL,
            block_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (av_id) REFERENCES attribute_views(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 单元格数据表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS av_cells (
            id TEXT PRIMARY KEY,
            row_id TEXT NOT NULL,
            column_id TEXT NOT NULL,
            value TEXT,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (row_id) REFERENCES av_rows(id) ON DELETE CASCADE,
            FOREIGN KEY (column_id) REFERENCES av_columns(id) ON DELETE CASCADE,
            UNIQUE(row_id, column_id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 索引
    conn.execute("CREATE INDEX IF NOT EXISTS idx_av_columns_av_id ON av_columns(av_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_av_views_av_id ON av_views(av_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_av_rows_av_id ON av_rows(av_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_av_cells_row_id ON av_cells(row_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_av_cells_column_id ON av_cells(column_id)", [])?;

    println!("[AttributeView] Database initialized at {:?}", db_path);
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

// 创建属性视图
#[command]
pub fn create_attribute_view(
    id: String,
    name: String,
    workspace_id: String,
) -> Result<AttributeView, String> {
    let now = chrono::Utc::now().timestamp_millis();

    with_db(|conn| {
        conn.execute(
            "INSERT INTO attribute_views (id, name, workspace_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, workspace_id, now, now],
        )?;

        // 创建默认表格视图
        let view_id = format!("{}-view", id);
        conn.execute(
            "INSERT INTO av_views (id, av_id, name, view_type, filters, sorts, group_by, page_size, icon, av_index)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![view_id, id, "Table", "table", None, None, None, 20, "📊", 0],
        )?;

        Ok(AttributeView {
            id,
            name,
            workspace_id,
            created_at: now,
            updated_at: now,
        })
    })
}

// 获取工作区的所有属性视图
#[command]
pub fn get_attribute_views(workspace_id: String) -> Result<Vec<AttributeView>, String> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, workspace_id, created_at, updated_at
             FROM attribute_views WHERE workspace_id = ?1 ORDER BY created_at DESC"
        )?;

        let views = stmt.query_map(params![workspace_id], |row| {
            Ok(AttributeView {
                id: row.get(0)?,
                name: row.get(1)?,
                workspace_id: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

        Ok(views)
    })
}

// 获取属性视图详情（包含列和视图）
#[command]
pub fn get_attribute_view_detail(av_id: String) -> Result<serde_json::Value, String> {
    with_db(|conn| {
        // 获取属性视图
        let mut stmt = conn.prepare(
            "SELECT id, name, workspace_id, created_at, updated_at FROM attribute_views WHERE id = ?1"
        )?;
        let av: AttributeView = stmt.query_row(params![av_id], |row| {
            Ok(AttributeView {
                id: row.get(0)?,
                name: row.get(1)?,
                workspace_id: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;

        // 获取列
        let mut col_stmt = conn.prepare(
            "SELECT id, av_id, name, column_type, options, width, hidden, wrap, icon, av_index
             FROM av_columns WHERE av_id = ?1 ORDER BY av_index"
        )?;
        let columns: Vec<AVColumn> = col_stmt.query_map(params![av_id], |row| {
            Ok(AVColumn {
                id: row.get(0)?,
                av_id: row.get(1)?,
                name: row.get(2)?,
                column_type: row.get(3)?,
                options: row.get(4)?,
                width: row.get(5)?,
                hidden: row.get::<_, i32>(6)? != 0,
                wrap: row.get::<_, i32>(7)? != 0,
                icon: row.get(8)?,
                index: row.get(9)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

        // 获取视图
        let mut view_stmt = conn.prepare(
            "SELECT id, av_id, name, view_type, filters, sorts, group_by, page_size, icon, av_index
             FROM av_views WHERE av_id = ?1 ORDER BY av_index"
        )?;
        let views: Vec<AVView> = view_stmt.query_map(params![av_id], |row| {
            Ok(AVView {
                id: row.get(0)?,
                av_id: row.get(1)?,
                name: row.get(2)?,
                view_type: row.get(3)?,
                filters: row.get(4)?,
                sorts: row.get(5)?,
                group_by: row.get(6)?,
                page_size: row.get(7)?,
                icon: row.get(8)?,
                index: row.get(9)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

        Ok(serde_json::json!({
            "attributeView": av,
            "columns": columns,
            "views": views
        }))
    })
}

// 添加列
#[command]
pub fn add_av_column(
    id: String,
    av_id: String,
    name: String,
    column_type: String,
    options: Option<String>,
    icon: Option<String>,
) -> Result<AVColumn, String> {
    with_db(|conn| {
        // 获取最大索引
        let max_index: i32 = conn.query_row(
            "SELECT COALESCE(MAX(av_index), -1) FROM av_columns WHERE av_id = ?1",
            params![av_id],
            |row| row.get(0),
        ).unwrap_or(-1);

        let new_index = max_index + 1;

        conn.execute(
            "INSERT INTO av_columns (id, av_id, name, column_type, options, width, hidden, wrap, icon, av_index)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![id, av_id, name, column_type, options, 200, 0, 0, icon, new_index],
        )?;

        // 更新属性视图时间
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE attribute_views SET updated_at = ?1 WHERE id = ?2",
            params![now, av_id],
        )?;

        Ok(AVColumn {
            id,
            av_id,
            name,
            column_type,
            options,
            width: 200,
            hidden: false,
            wrap: false,
            icon,
            index: new_index,
        })
    })
}

// 更新列
#[command]
pub fn update_av_column(
    id: String,
    name: Option<String>,
    column_type: Option<String>,
    options: Option<String>,
    width: Option<i32>,
    hidden: Option<bool>,
    wrap: Option<bool>,
    icon: Option<String>,
) -> Result<(), String> {
    with_db(|conn| {
        if let Some(n) = name {
            conn.execute("UPDATE av_columns SET name = ?1 WHERE id = ?2", params![n, id])?;
        }
        if let Some(t) = column_type {
            conn.execute("UPDATE av_columns SET column_type = ?1 WHERE id = ?2", params![t, id])?;
        }
        if let Some(o) = options {
            conn.execute("UPDATE av_columns SET options = ?1 WHERE id = ?2", params![o, id])?;
        }
        if let Some(w) = width {
            conn.execute("UPDATE av_columns SET width = ?1 WHERE id = ?2", params![w, id])?;
        }
        if let Some(h) = hidden {
            conn.execute("UPDATE av_columns SET hidden = ?1 WHERE id = ?2", params![h as i32, id])?;
        }
        if let Some(wr) = wrap {
            conn.execute("UPDATE av_columns SET wrap = ?1 WHERE id = ?2", params![wr as i32, id])?;
        }
        if let Some(i) = icon {
            conn.execute("UPDATE av_columns SET icon = ?1 WHERE id = ?2", params![i, id])?;
        }

        Ok(())
    })
}

// 删除列
#[command]
pub fn delete_av_column(id: String) -> Result<(), String> {
    with_db(|conn| {
        conn.execute("DELETE FROM av_columns WHERE id = ?1", params![id])?;
        Ok(())
    })
}

// 添加行（关联到文档）
#[command]
pub fn add_av_row(id: String, av_id: String, block_id: String) -> Result<AVRow, String> {
    let now = chrono::Utc::now().timestamp_millis();

    with_db(|conn| {
        conn.execute(
            "INSERT INTO av_rows (id, av_id, block_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, av_id, block_id, now, now],
        )?;

        Ok(AVRow {
            id,
            av_id,
            block_id,
            created_at: now,
            updated_at: now,
        })
    })
}

// 删除行
#[command]
pub fn delete_av_row(id: String) -> Result<(), String> {
    with_db(|conn| {
        conn.execute("DELETE FROM av_rows WHERE id = ?1", params![id])?;
        Ok(())
    })
}

// 获取行的单元格数据
#[command]
pub fn get_av_row_cells(row_id: String) -> Result<Vec<AVCell>, String> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, row_id, column_id, value, updated_at FROM av_cells WHERE row_id = ?1"
        )?;

        let cells = stmt.query_map(params![row_id], |row| {
            Ok(AVCell {
                id: row.get(0)?,
                row_id: row.get(1)?,
                column_id: row.get(2)?,
                value: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

        Ok(cells)
    })
}

// 获取视图的所有行数据
#[command]
pub fn get_av_rows(av_id: String) -> Result<Vec<serde_json::Value>, String> {
    with_db(|conn| {
        // 获取所有行
        let mut stmt = conn.prepare(
            "SELECT r.id, r.av_id, r.block_id, r.created_at, r.updated_at
             FROM av_rows r WHERE r.av_id = ?1 ORDER BY r.created_at DESC"
        )?;

        let rows: Vec<(String, String, String, i64, i64)> = stmt.query_map(params![av_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })?
        .filter_map(|r| r.ok())
        .collect();

        // 获取列信息
        let mut col_stmt = conn.prepare(
            "SELECT id, name, column_type, options FROM av_columns WHERE av_id = ?1 ORDER BY av_index"
        )?;
        let columns: Vec<(String, String, String, Option<String>)> = col_stmt.query_map(params![av_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get(3)?,
            ))
        })?
        .filter_map(|r| r.ok())
        .collect();

        // 获取每个行的单元格数据
        let mut result = Vec::new();
        for (row_id, _av_id, block_id, created_at, updated_at) in rows {
            let mut cell_stmt = conn.prepare(
                "SELECT column_id, value FROM av_cells WHERE row_id = ?1"
            )?;
            let cells: Vec<(String, String)> = cell_stmt.query_map(params![row_id], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })?
            .filter_map(|r| r.ok())
            .collect();

            // 转换为列名 -> 值 的映射
            let mut row_data = serde_json::Map::new();
            row_data.insert("id".to_string(), serde_json::json!(row_id));
            row_data.insert("blockId".to_string(), serde_json::json!(block_id));
            row_data.insert("createdAt".to_string(), serde_json::json!(created_at));
            row_data.insert("updatedAt".to_string(), serde_json::json!(updated_at));

            for (col_id, value) in cells {
                // 找到列名
                if let Some((_, col_name, _, _)) = columns.iter().find(|(id, _, _, _)| id == &col_id) {
                    // 解析 JSON 值
                    let parsed: serde_json::Value = serde_json::from_str(&value).unwrap_or(serde_json::Value::Null);
                    row_data.insert(col_name.clone(), parsed);
                }
            }

            result.push(serde_json::Value::Object(row_data));
        }

        Ok(serde_json::json!({
            "columns": columns.iter().map(|(id, name, col_type, options)| {
                serde_json::json!({
                    "id": id,
                    "name": name,
                    "type": col_type,
                    "options": options.as_ref().map(|s| serde_json::from_str::<Vec<SelectOption>>(s).unwrap_or_default()).unwrap_or_default()
                })
            }).collect::<Vec<_>>(),
            "rows": result
        }))
    })
}

// 设置单元格值
#[command]
pub fn set_av_cell(
    id: String,
    row_id: String,
    column_id: String,
    value: String,
) -> Result<AVCell, String> {
    let now = chrono::Utc::now().timestamp_millis();

    with_db(|conn| {
        conn.execute(
            "INSERT INTO av_cells (id, row_id, column_id, value, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(row_id, column_id) DO UPDATE SET value = ?4, updated_at = ?5",
            params![id, row_id, column_id, value, now],
        )?;

        // 更新行时间
        conn.execute(
            "UPDATE av_rows SET updated_at = ?1 WHERE id = ?2",
            params![now, row_id],
        )?;

        Ok(AVCell {
            id,
            row_id,
            column_id,
            value,
            updated_at: now,
        })
    })
}

// 删除属性视图
#[command]
pub fn delete_attribute_view(id: String) -> Result<(), String> {
    with_db(|conn| {
        conn.execute("DELETE FROM attribute_views WHERE id = ?1", params![id])?;
        Ok(())
    })
}

// 添加视图
#[command]
pub fn add_av_view(
    id: String,
    av_id: String,
    name: String,
    view_type: String,
    icon: Option<String>,
) -> Result<AVView, String> {
    with_db(|conn| {
        let max_index: i32 = conn.query_row(
            "SELECT COALESCE(MAX(av_index), -1) FROM av_views WHERE av_id = ?1",
            params![av_id],
            |row| row.get(0),
        ).unwrap_or(-1);

        let new_index = max_index + 1;

        conn.execute(
            "INSERT INTO av_views (id, av_id, name, view_type, filters, sorts, group_by, page_size, icon, av_index)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![id, av_id, name, view_type, None, None, None, 20, icon, new_index],
        )?;

        Ok(AVView {
            id,
            av_id,
            name,
            view_type,
            filters: None,
            sorts: None,
            group_by: None,
            page_size: 20,
            icon,
            index: new_index,
        })
    })
}

// 更新视图（筛选、排序、分组）
#[command]
pub fn update_av_view(
    id: String,
    name: Option<String>,
    view_type: Option<String>,
    filters: Option<String>,
    sorts: Option<String>,
    group_by: Option<String>,
    page_size: Option<i32>,
    icon: Option<String>,
) -> Result<(), String> {
    with_db(|conn| {
        if let Some(n) = name {
            conn.execute("UPDATE av_views SET name = ?1 WHERE id = ?2", params![n, id])?;
        }
        if let Some(t) = view_type {
            conn.execute("UPDATE av_views SET view_type = ?1 WHERE id = ?2", params![t, id])?;
        }
        if let Some(f) = filters {
            conn.execute("UPDATE av_views SET filters = ?1 WHERE id = ?2", params![f, id])?;
        }
        if let Some(s) = sorts {
            conn.execute("UPDATE av_views SET sorts = ?1 WHERE id = ?2", params![s, id])?;
        }
        if let Some(g) = group_by {
            conn.execute("UPDATE av_views SET group_by = ?1 WHERE id = ?2", params![g, id])?;
        }
        if let Some(p) = page_size {
            conn.execute("UPDATE av_views SET page_size = ?1 WHERE id = ?2", params![p, id])?;
        }
        if let Some(i) = icon {
            conn.execute("UPDATE av_views SET icon = ?1 WHERE id = ?2", params![i, id])?;
        }

        Ok(())
    })
}

// 删除视图
#[command]
pub fn delete_av_view(id: String) -> Result<(), String> {
    with_db(|conn| {
        conn.execute("DELETE FROM av_views WHERE id = ?1", params![id])?;
        Ok(())
    })
}

// 重命名属性视图
#[command]
pub fn rename_attribute_view(id: String, name: String) -> Result<(), String> {
    let now = chrono::Utc::now().timestamp_millis();

    with_db(|conn| {
        conn.execute(
            "UPDATE attribute_views SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, id],
        )?;
        Ok(())
    })
}