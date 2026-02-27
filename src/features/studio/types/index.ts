export type ToolType = "select" | "rectangle" | "ellipse" | "text" | "frame" | "hand";

export interface StudioObject {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
  parentId?: string;
  isFrame?: boolean;
  isComponent?: boolean;
}

export interface LayerTreeNode extends StudioObject {
  selected: boolean;
  children: LayerTreeNode[];
  depth: number;
}

export interface ObjectProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius: number;
  objectType: string;
  // Text-specific properties
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface StudioActions {
  setCanvas: (canvas: HTMLCanvasElement | null) => void;
  setTool: (tool: ToolType) => void;
  addObject: (obj: StudioObject) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, updates: Partial<StudioObject>) => void;
  setSelectedIds: (ids: string[]) => void;
  setZoom: (zoom: number) => void;
  setCursorPosition: (pos: CursorPosition) => void;
  syncObjectsFromCanvas: () => void;
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  deleteSelected: () => void;
  toggleComponent: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
}

export interface StudioState {
  fabricCanvas: null;
  activeTool: ToolType;
  selectedObjectIds: string[];
  objects: StudioObject[];
  zoom: number;
  cursorPosition: CursorPosition;
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  actions: StudioActions;
}

export interface ToolConfig {
  type: ToolType;
  label: string;
  shortcut: string;
  icon: string;
}

export const TOOL_CONFIGS: ToolConfig[] = [
  { type: "select", label: "Select", shortcut: "V", icon: "MousePointer2" },
  { type: "rectangle", label: "Rectangle", shortcut: "R", icon: "Square" },
  { type: "ellipse", label: "Ellipse", shortcut: "O", icon: "Circle" },
  { type: "text", label: "Text", shortcut: "T", icon: "Type" },
  { type: "frame", label: "Frame", shortcut: "F", icon: "Frame" },
  { type: "hand", label: "Hand", shortcut: "H", icon: "Hand" },
];
