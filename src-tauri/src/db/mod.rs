pub mod canvas;
pub mod chat;

use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;

use crate::migrations;

pub fn init_db(app_data_dir: PathBuf) -> Result<Connection, rusqlite::Error> {
    fs::create_dir_all(&app_data_dir).expect("failed to create app data directory");

    let db_path = app_data_dir.join("pigment.db");
    let conn = Connection::open(db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    migrations::run_migrations(&conn)?;

    Ok(conn)
}
