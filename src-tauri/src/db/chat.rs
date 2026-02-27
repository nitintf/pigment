use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: String,
    pub canvas_id: String,
    pub model: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageRow {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewChatMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
}

pub fn create_session(
    conn: &Connection,
    id: &str,
    canvas_id: &str,
    model: &str,
    name: &str,
) -> Result<ChatSession, rusqlite::Error> {
    conn.execute(
        "INSERT INTO chat_sessions (id, canvas_id, model, name) VALUES (?1, ?2, ?3, ?4)",
        params![id, canvas_id, model, name],
    )?;

    conn.query_row(
        "SELECT id, canvas_id, model, name, created_at, updated_at FROM chat_sessions WHERE id = ?1",
        params![id],
        |row| {
            Ok(ChatSession {
                id: row.get(0)?,
                canvas_id: row.get(1)?,
                model: row.get(2)?,
                name: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
}

pub fn list_sessions(conn: &Connection, canvas_id: &str) -> Result<Vec<ChatSession>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, canvas_id, model, name, created_at, updated_at FROM chat_sessions WHERE canvas_id = ?1 ORDER BY created_at"
    )?;

    let rows = stmt.query_map(params![canvas_id], |row| {
        Ok(ChatSession {
            id: row.get(0)?,
            canvas_id: row.get(1)?,
            model: row.get(2)?,
            name: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    rows.collect()
}

pub fn delete_session(conn: &Connection, id: &str) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM chat_sessions WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn save_message(conn: &Connection, msg: &NewChatMessage) -> Result<ChatMessageRow, rusqlite::Error> {
    conn.execute(
        "INSERT INTO chat_messages (id, session_id, role, content) VALUES (?1, ?2, ?3, ?4)",
        params![msg.id, msg.session_id, msg.role, msg.content],
    )?;

    conn.execute(
        "UPDATE chat_sessions SET updated_at = datetime('now') WHERE id = ?1",
        params![msg.session_id],
    )?;

    conn.query_row(
        "SELECT id, session_id, role, content, created_at FROM chat_messages WHERE id = ?1",
        params![msg.id],
        |row| {
            Ok(ChatMessageRow {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
}

pub fn get_messages(conn: &Connection, session_id: &str) -> Result<Vec<ChatMessageRow>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, role, content, created_at FROM chat_messages WHERE session_id = ?1 ORDER BY created_at"
    )?;

    let rows = stmt.query_map(params![session_id], |row| {
        Ok(ChatMessageRow {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    rows.collect()
}

pub fn clear_messages(conn: &Connection, session_id: &str) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM chat_messages WHERE session_id = ?1", params![session_id])?;
    Ok(())
}
