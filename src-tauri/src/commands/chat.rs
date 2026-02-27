use tauri::State;
use uuid::Uuid;

use crate::db;
use crate::db::chat::NewChatMessage;
use crate::state::AppState;

#[tauri::command]
pub fn create_chat_session(
    state: State<'_, AppState>,
    canvas_id: String,
    model: String,
    name: String,
) -> Result<db::chat::ChatSession, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    db::chat::create_session(&conn, &id, &canvas_id, &model, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_chat_sessions(
    state: State<'_, AppState>,
    canvas_id: String,
) -> Result<Vec<db::chat::ChatSession>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::chat::list_sessions(&conn, &canvas_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_chat_session(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::chat::delete_session(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_chat_message(
    state: State<'_, AppState>,
    session_id: String,
    role: String,
    content: String,
) -> Result<db::chat::ChatMessageRow, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let msg = NewChatMessage {
        id: Uuid::new_v4().to_string(),
        session_id,
        role,
        content,
    };
    db::chat::save_message(&conn, &msg).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chat_messages(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Vec<db::chat::ChatMessageRow>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::chat::get_messages(&conn, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_chat_messages(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::chat::clear_messages(&conn, &session_id).map_err(|e| e.to_string())
}
