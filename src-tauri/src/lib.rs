mod commands;
mod db;
mod easel;
mod migrations;
mod state;

use state::AppState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory");

            let conn = db::init_db(app_data_dir.clone())
                .expect("failed to initialize database");

            // Migrate existing canvas_states rows to .easel files
            easel::migrate_canvas_states_to_files(&conn, &app_data_dir);

            // Run migration 002 to drop canvas_states table
            migrations::run_migrations(&conn)
                .expect("failed to run migrations");

            app.manage(AppState {
                db: Mutex::new(conn),
                app_data_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::canvas::list_canvases,
            commands::canvas::create_canvas,
            commands::canvas::rename_canvas,
            commands::canvas::delete_canvas,
            commands::canvas::get_canvas_state,
            commands::canvas::save_canvas_state,
            commands::canvas::import_easel_file,
            commands::chat::create_chat_session,
            commands::chat::list_chat_sessions,
            commands::chat::delete_chat_session,
            commands::chat::save_chat_message,
            commands::chat::get_chat_messages,
            commands::chat::clear_chat_messages,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
