use tauri::State;
use uuid::Uuid;

use crate::db;
use crate::state::AppState;

#[tauri::command]
pub fn list_canvases(state: State<'_, AppState>) -> Result<Vec<db::canvas::CanvasMeta>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::canvas::list_canvases(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_canvas(state: State<'_, AppState>, name: String) -> Result<db::canvas::CanvasMeta, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM canvases", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    db::canvas::create_canvas(&conn, &id, &name, count).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_canvas(state: State<'_, AppState>, id: String, name: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::canvas::rename_canvas(&conn, &id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_canvas(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::canvas::delete_canvas(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_canvas_state(state: State<'_, AppState>, canvas_id: String) -> Result<Option<db::canvas::CanvasState>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::canvas::get_canvas_state(&conn, &canvas_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_canvas_state(
    state: State<'_, AppState>,
    canvas_id: String,
    canvas_json: String,
    zoom: f64,
    viewport_transform: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::canvas::save_canvas_state(&conn, &canvas_id, &canvas_json, zoom, &viewport_transform)
        .map_err(|e| e.to_string())
}
