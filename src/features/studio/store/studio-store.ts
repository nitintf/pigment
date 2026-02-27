import { create } from "zustand";

import type { CursorPosition, StudioObject, StudioState, ToolType } from "../types";
import type { Canvas } from "fabric";

let fabricCanvasRef: Canvas | null = null;

export function getFabricCanvas(): Canvas | null {
  return fabricCanvasRef;
}

export function setFabricCanvasRef(canvas: Canvas | null): void {
  fabricCanvasRef = canvas;
}

function extractObjectsFromCanvas(canvas: Canvas): StudioObject[] {
  return canvas.getObjects().map((obj, index) => {
    const custom = obj as unknown as {
      id?: string;
      name?: string;
      isFrame?: boolean;
      isComponent?: boolean;
      parentId?: string;
    };
    return {
      id: custom.id ?? `obj-${String(index)}`,
      type: obj.type ?? "unknown",
      name: custom.name ?? `${obj.type ?? "Object"} ${String(index + 1)}`,
      visible: obj.visible !== false,
      locked: obj.selectable === false,
      parentId: custom.parentId,
      isFrame: custom.isFrame,
      isComponent: custom.isComponent,
    };
  });
}

export const useStudioStore = create<StudioState>()((set) => ({
  fabricCanvas: null,
  activeTool: "select",
  selectedObjectIds: [],
  objects: [],
  zoom: 1,
  cursorPosition: { x: 0, y: 0 },
  leftSidebarOpen: false,
  rightPanelOpen: false,
  actions: {
    setCanvas: () => {
      set({ fabricCanvas: null });
    },
    setTool: (tool: ToolType) => {
      set({ activeTool: tool });
    },
    addObject: (obj: StudioObject) => {
      set((state) => ({ objects: [...state.objects, obj] }));
    },
    removeObject: (id: string) => {
      set((state) => ({
        objects: state.objects.filter((o) => o.id !== id),
        selectedObjectIds: state.selectedObjectIds.filter((sid) => sid !== id),
      }));
    },
    updateObject: (id: string, updates: Partial<StudioObject>) => {
      set((state) => ({
        objects: state.objects.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      }));
    },
    setSelectedIds: (ids: string[]) => {
      set({ selectedObjectIds: ids });
    },
    setZoom: (zoom: number) => {
      set({ zoom });
    },
    setCursorPosition: (pos: CursorPosition) => {
      set({ cursorPosition: pos });
    },
    syncObjectsFromCanvas: () => {
      const canvas = getFabricCanvas();
      if (!canvas) {
        return;
      }
      set({ objects: extractObjectsFromCanvas(canvas) });
    },
    toggleLeftSidebar: () => {
      set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }));
    },
    toggleRightPanel: () => {
      set((state) => ({ rightPanelOpen: !state.rightPanelOpen }));
    },
    openRightPanel: () => {
      set({ rightPanelOpen: true });
    },
    closeRightPanel: () => {
      set({ rightPanelOpen: false });
    },
    toggleComponent: () => {
      const canvas = getFabricCanvas();
      if (!canvas) return;
      const obj = canvas.getActiveObject();
      if (!obj) return;
      const custom = obj as unknown as { isComponent?: boolean };
      custom.isComponent = !custom.isComponent;
      canvas.requestRenderAll();
      set({ objects: extractObjectsFromCanvas(canvas) });
    },
    deleteSelected: () => {
      const canvas = getFabricCanvas();
      if (!canvas) return;
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length === 0) return;
      // Don't delete if an IText is being edited
      const isEditing = activeObjects.some(
        (obj) => (obj as unknown as { isEditing?: boolean }).isEditing,
      );
      if (isEditing) return;

      // Collect IDs of frames being deleted for orphan promotion
      const deletedFrameIds = new Set<string>();
      for (const obj of activeObjects) {
        const custom = obj as unknown as { id?: string; isFrame?: boolean };
        if (custom.isFrame && custom.id) {
          deletedFrameIds.add(custom.id);
        }
      }

      canvas.discardActiveObject();
      for (const obj of activeObjects) {
        canvas.remove(obj);
      }

      // Promote orphaned children to top-level
      if (deletedFrameIds.size > 0) {
        for (const obj of canvas.getObjects()) {
          const custom = obj as unknown as { parentId?: string };
          if (custom.parentId && deletedFrameIds.has(custom.parentId)) {
            custom.parentId = undefined;
          }
        }
      }

      canvas.requestRenderAll();
      set({ selectedObjectIds: [], objects: extractObjectsFromCanvas(canvas) });
    },
    zoomIn: () => {
      const canvas = getFabricCanvas();
      if (!canvas) return;
      const currentZoom = canvas.getZoom();
      const newZoom = Math.min(currentZoom * 1.2, 20);
      canvas.zoomToPoint(canvas.getCenterPoint(), newZoom);
      set({ zoom: Math.round(newZoom * 100) / 100 });
    },
    zoomOut: () => {
      const canvas = getFabricCanvas();
      if (!canvas) return;
      const currentZoom = canvas.getZoom();
      const newZoom = Math.max(currentZoom / 1.2, 0.1);
      canvas.zoomToPoint(canvas.getCenterPoint(), newZoom);
      set({ zoom: Math.round(newZoom * 100) / 100 });
    },
    zoomTo: (zoom: number) => {
      const canvas = getFabricCanvas();
      if (!canvas) return;
      const clampedZoom = Math.min(Math.max(0.1, zoom), 20);
      canvas.zoomToPoint(canvas.getCenterPoint(), clampedZoom);
      set({ zoom: Math.round(clampedZoom * 100) / 100 });
    },
  },
}));
