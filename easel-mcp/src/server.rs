use chrono::Utc;
use glob::glob;
use rmcp::{
    ErrorData as McpError, ServerHandler,
    handler::server::router::tool::ToolRouter,
    handler::server::wrapper::Parameters,
    model::*,
    schemars, tool, tool_handler, tool_router,
};
use serde::Serialize;
use serde_json::Value;
use std::path::PathBuf;
use uuid::Uuid;

use crate::easel::EaselFile;

// ── Parameter structs ───────────────────────────────────────────────────────

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct CreateEaselFileParams {
    #[schemars(description = "Path where the new .easel file should be created")]
    pub file_path: String,
    #[schemars(description = "Name for the canvas")]
    #[serde(default = "default_canvas_name")]
    pub name: String,
}

fn default_canvas_name() -> String {
    "Untitled".to_string()
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct ListEaselFilesParams {
    #[schemars(description = "Directory path to search for .easel files")]
    pub directory: String,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct GetCanvasStateParams {
    #[schemars(description = "Path to the .easel file")]
    pub file_path: String,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct GetObjectParams {
    #[schemars(description = "Path to the .easel file")]
    pub file_path: String,
    #[schemars(description = "Object ID to retrieve")]
    pub id: String,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct CreateObjectParams {
    #[schemars(description = "Path to the .easel file")]
    pub file_path: String,
    #[schemars(description = "Object type: rect, ellipse, text, or frame")]
    #[serde(rename = "type")]
    pub object_type: String,
    #[schemars(description = "X position (left)")]
    #[serde(default = "default_position")]
    pub x: f64,
    #[schemars(description = "Y position (top)")]
    #[serde(default = "default_position")]
    pub y: f64,
    #[schemars(description = "Width of the object")]
    #[serde(default = "default_size")]
    pub width: f64,
    #[schemars(description = "Height of the object")]
    #[serde(default = "default_size")]
    pub height: f64,
    #[schemars(description = "Fill color (hex)")]
    pub fill: Option<String>,
    #[schemars(description = "Stroke color (hex)")]
    pub stroke: Option<String>,
    #[schemars(description = "Optional name for the object")]
    pub name: Option<String>,
    #[schemars(description = "Text content (only for type=text)")]
    pub text: Option<String>,
    #[schemars(description = "Font size (only for type=text)")]
    pub font_size: Option<f64>,
}

fn default_position() -> f64 {
    100.0
}
fn default_size() -> f64 {
    200.0
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct UpdateObjectParams {
    #[schemars(description = "Path to the .easel file")]
    pub file_path: String,
    #[schemars(description = "Object ID to update")]
    pub id: String,
    #[schemars(description = "Properties to update (e.g. left, top, width, height, fill, stroke, name, text, fontSize)")]
    pub properties: Value,
}

#[derive(Debug, serde::Deserialize, schemars::JsonSchema)]
pub struct DeleteObjectsParams {
    #[schemars(description = "Path to the .easel file")]
    pub file_path: String,
    #[schemars(description = "Array of object IDs to delete")]
    pub ids: Vec<String>,
}

// ── Response structs ────────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EaselFileInfo {
    path: String,
    name: String,
    object_count: usize,
}

// ── MCP Server ──────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct EaselMcpServer {
    tool_router: ToolRouter<Self>,
}

#[tool_router]
impl EaselMcpServer {
    pub fn new() -> Self {
        Self {
            tool_router: Self::tool_router(),
        }
    }

    /// Create a new empty .easel file at the given path.
    #[tool(name = "create_easel_file", description = "Create a new empty .easel canvas file at the given path")]
    fn create_easel_file(
        &self,
        Parameters(params): Parameters<CreateEaselFileParams>,
    ) -> Result<CallToolResult, McpError> {
        let path = PathBuf::from(&params.file_path);

        if path.exists() {
            return Err(McpError::invalid_params(
                format!("File already exists: {}", path.display()),
                None,
            ));
        }

        let easel = EaselFile::new(&params.name);
        easel.save(&path).map_err(|e| McpError::internal_error(e, None))?;

        let result = serde_json::json!({
            "filePath": path.display().to_string(),
            "name": params.name,
            "message": "Created new .easel file"
        });

        let json = serde_json::to_string_pretty(&result)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        Ok(CallToolResult::success(vec![Content::text(json)]))
    }

    /// List .easel files in a directory, showing paths, names, and object counts.
    #[tool(name = "list_easel_files", description = "List .easel files in a directory with their paths, names, and object counts")]
    fn list_easel_files(
        &self,
        Parameters(params): Parameters<ListEaselFilesParams>,
    ) -> Result<CallToolResult, McpError> {
        let pattern = format!("{}/**/*.easel", params.directory);
        let mut files = Vec::new();

        let entries = glob(&pattern).map_err(|e| {
            McpError::internal_error(format!("Invalid glob pattern: {}", e), None)
        })?;

        for entry in entries.flatten() {
            match EaselFile::load(&entry) {
                Ok(easel) => {
                    files.push(EaselFileInfo {
                        path: entry.display().to_string(),
                        name: easel.name.clone(),
                        object_count: easel.objects().len(),
                    });
                }
                Err(_) => continue,
            }
        }

        let json = serde_json::to_string_pretty(&files)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        Ok(CallToolResult::success(vec![Content::text(json)]))
    }

    /// Read the full object tree from an .easel file.
    #[tool(name = "get_canvas_state", description = "Read the full canvas object tree from an .easel file")]
    fn get_canvas_state(
        &self,
        Parameters(params): Parameters<GetCanvasStateParams>,
    ) -> Result<CallToolResult, McpError> {
        let path = PathBuf::from(&params.file_path);
        let easel = EaselFile::load(&path)
            .map_err(|e| McpError::internal_error(e, None))?;

        let json = serde_json::to_string_pretty(&easel.canvas)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        Ok(CallToolResult::success(vec![Content::text(json)]))
    }

    /// Get detailed properties of a single object by ID.
    #[tool(name = "get_object", description = "Get detailed properties of a single canvas object by its ID")]
    fn get_object(
        &self,
        Parameters(params): Parameters<GetObjectParams>,
    ) -> Result<CallToolResult, McpError> {
        let path = PathBuf::from(&params.file_path);
        let easel = EaselFile::load(&path)
            .map_err(|e| McpError::internal_error(e, None))?;

        let obj = easel.find_object(&params.id).ok_or_else(|| {
            McpError::internal_error(format!("Object not found: {}", params.id), None)
        })?;

        let json = serde_json::to_string_pretty(obj)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        Ok(CallToolResult::success(vec![Content::text(json)]))
    }

    /// Create a new object (rect, ellipse, text, or frame) in an .easel file.
    #[tool(name = "create_object", description = "Create a new canvas object (rect, ellipse, text, or frame) in an .easel file")]
    fn create_object(
        &self,
        Parameters(params): Parameters<CreateObjectParams>,
    ) -> Result<CallToolResult, McpError> {
        let path = PathBuf::from(&params.file_path);
        let mut easel = if path.exists() {
            EaselFile::load(&path).map_err(|e| McpError::internal_error(e, None))?
        } else {
            EaselFile::new("Untitled")
        };

        let id = Uuid::new_v4().to_string();

        let obj = match params.object_type.as_str() {
            "rect" => {
                let fill = params.fill.unwrap_or_else(|| "#d9d9d9".to_string());
                let stroke = params.stroke.unwrap_or_else(|| "#b3b3b3".to_string());
                let name = params.name.unwrap_or_else(|| "Rectangle".to_string());
                serde_json::json!({
                    "type": "Rect",
                    "id": id,
                    "name": name,
                    "left": params.x,
                    "top": params.y,
                    "width": params.width,
                    "height": params.height,
                    "fill": fill,
                    "stroke": stroke,
                    "strokeWidth": 1,
                    "strokeUniform": true,
                    "originX": "left",
                    "originY": "top",
                    "version": "7.0.0"
                })
            }
            "ellipse" => {
                let fill = params.fill.unwrap_or_else(|| "#d9d9d9".to_string());
                let stroke = params.stroke.unwrap_or_else(|| "#b3b3b3".to_string());
                let name = params.name.unwrap_or_else(|| "Ellipse".to_string());
                serde_json::json!({
                    "type": "Ellipse",
                    "id": id,
                    "name": name,
                    "left": params.x,
                    "top": params.y,
                    "rx": params.width / 2.0,
                    "ry": params.height / 2.0,
                    "fill": fill,
                    "stroke": stroke,
                    "strokeWidth": 1,
                    "strokeUniform": true,
                    "originX": "left",
                    "originY": "top",
                    "version": "7.0.0"
                })
            }
            "text" => {
                let fill = params.fill.unwrap_or_else(|| "#ffffff".to_string());
                let text_content = params.text.unwrap_or_else(|| "Text".to_string());
                let font_size = params.font_size.unwrap_or(16.0);
                let name = params.name.unwrap_or_else(|| "Text".to_string());
                serde_json::json!({
                    "type": "IText",
                    "id": id,
                    "name": name,
                    "text": text_content,
                    "left": params.x,
                    "top": params.y,
                    "fontSize": font_size,
                    "fontFamily": "Inter, system-ui, sans-serif",
                    "fill": fill,
                    "originX": "left",
                    "originY": "top",
                    "version": "7.0.0"
                })
            }
            "frame" => {
                let name = params.name.unwrap_or_else(|| "Frame".to_string());
                serde_json::json!({
                    "type": "Rect",
                    "id": id,
                    "name": name,
                    "isFrame": true,
                    "left": params.x,
                    "top": params.y,
                    "width": params.width,
                    "height": params.height,
                    "fill": "#ffffff",
                    "stroke": "#e0e0e0",
                    "strokeWidth": 1,
                    "strokeUniform": true,
                    "originX": "left",
                    "originY": "top",
                    "version": "7.0.0"
                })
            }
            other => {
                return Err(McpError::invalid_params(
                    format!("Unknown object type: {}. Use rect, ellipse, text, or frame.", other),
                    None,
                ));
            }
        };

        easel.objects_mut().push(obj.clone());
        easel.updated_at = Utc::now();
        easel.save(&path).map_err(|e| McpError::internal_error(e, None))?;

        let json = serde_json::to_string_pretty(&obj)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        Ok(CallToolResult::success(vec![Content::text(json)]))
    }

    /// Update properties of an existing object by ID.
    #[tool(name = "update_object", description = "Update properties of an existing canvas object by its ID")]
    fn update_object(
        &self,
        Parameters(params): Parameters<UpdateObjectParams>,
    ) -> Result<CallToolResult, McpError> {
        let path = PathBuf::from(&params.file_path);
        let mut easel = EaselFile::load(&path)
            .map_err(|e| McpError::internal_error(e, None))?;

        let obj = easel.find_object_mut(&params.id).ok_or_else(|| {
            McpError::internal_error(format!("Object not found: {}", params.id), None)
        })?;

        // Merge properties into the existing object
        if let (Some(target), Some(source)) = (obj.as_object_mut(), params.properties.as_object()) {
            for (key, value) in source {
                if key == "id" || key == "type" {
                    continue;
                }
                target.insert(key.clone(), value.clone());
            }
        }

        let updated = obj.clone();
        easel.updated_at = Utc::now();
        easel.save(&path).map_err(|e| McpError::internal_error(e, None))?;

        let json = serde_json::to_string_pretty(&updated)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        Ok(CallToolResult::success(vec![Content::text(json)]))
    }

    /// Delete objects by ID array from an .easel file.
    #[tool(name = "delete_objects", description = "Delete one or more canvas objects by their IDs from an .easel file")]
    fn delete_objects(
        &self,
        Parameters(params): Parameters<DeleteObjectsParams>,
    ) -> Result<CallToolResult, McpError> {
        let path = PathBuf::from(&params.file_path);
        let mut easel = EaselFile::load(&path)
            .map_err(|e| McpError::internal_error(e, None))?;

        let removed = easel.remove_objects(&params.ids);
        let not_found: Vec<&str> = params
            .ids
            .iter()
            .filter(|id| !removed.contains(id))
            .map(|s| s.as_str())
            .collect();

        easel.updated_at = Utc::now();
        easel.save(&path).map_err(|e| McpError::internal_error(e, None))?;

        let result = serde_json::json!({
            "deleted": removed,
            "notFound": not_found,
        });

        let json = serde_json::to_string_pretty(&result)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;

        Ok(CallToolResult::success(vec![Content::text(json)]))
    }
}

#[tool_handler]
impl ServerHandler for EaselMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            instructions: Some(
                "Easel MCP server: read and write Fabric.js canvas objects in .easel files. \
                 Use list_easel_files to discover files, get_canvas_state to read the full object tree, \
                 get_object for individual object details, and create_object/update_object/delete_objects to modify."
                    .to_string(),
            ),
            capabilities: ServerCapabilities::builder()
                .enable_tools()
                .build(),
            server_info: Implementation::from_build_env(),
            ..Default::default()
        }
    }
}
