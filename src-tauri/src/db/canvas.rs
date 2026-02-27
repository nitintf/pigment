use rusqlite::{params, Connection};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasMeta {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasState {
    pub canvas_id: String,
    pub canvas_json: String,
    pub zoom: f64,
    pub viewport_transform: String,
    pub updated_at: String,
}

pub fn list_canvases(conn: &Connection) -> Result<Vec<CanvasMeta>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, sort_order, created_at, updated_at FROM canvases ORDER BY sort_order, created_at"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(CanvasMeta {
            id: row.get(0)?,
            name: row.get(1)?,
            sort_order: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;

    rows.collect()
}

pub fn create_canvas(conn: &Connection, id: &str, name: &str, sort_order: i32) -> Result<CanvasMeta, rusqlite::Error> {
    conn.execute(
        "INSERT INTO canvases (id, name, sort_order) VALUES (?1, ?2, ?3)",
        params![id, name, sort_order],
    )?;

    // Also create an empty canvas state row
    conn.execute(
        "INSERT INTO canvas_states (canvas_id) VALUES (?1)",
        params![id],
    )?;

    conn.query_row(
        "SELECT id, name, sort_order, created_at, updated_at FROM canvases WHERE id = ?1",
        params![id],
        |row| {
            Ok(CanvasMeta {
                id: row.get(0)?,
                name: row.get(1)?,
                sort_order: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
}

pub fn rename_canvas(conn: &Connection, id: &str, name: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE canvases SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![name, id],
    )?;
    Ok(())
}

pub fn delete_canvas(conn: &Connection, id: &str) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM canvases WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_canvas_state(conn: &Connection, canvas_id: &str) -> Result<Option<CanvasState>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT canvas_id, canvas_json, zoom, viewport_transform, updated_at FROM canvas_states WHERE canvas_id = ?1"
    )?;

    let result = stmt.query_row(params![canvas_id], |row| {
        Ok(CanvasState {
            canvas_id: row.get(0)?,
            canvas_json: row.get(1)?,
            zoom: row.get(2)?,
            viewport_transform: row.get(3)?,
            updated_at: row.get(4)?,
        })
    });

    match result {
        Ok(state) => Ok(Some(state)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn save_canvas_state(
    conn: &Connection,
    canvas_id: &str,
    canvas_json: &str,
    zoom: f64,
    viewport_transform: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO canvas_states (canvas_id, canvas_json, zoom, viewport_transform, updated_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))
         ON CONFLICT(canvas_id) DO UPDATE SET
            canvas_json = excluded.canvas_json,
            zoom = excluded.zoom,
            viewport_transform = excluded.viewport_transform,
            updated_at = excluded.updated_at",
        params![canvas_id, canvas_json, zoom, viewport_transform],
    )?;

    conn.execute(
        "UPDATE canvases SET updated_at = datetime('now') WHERE id = ?1",
        params![canvas_id],
    )?;

    Ok(())
}
