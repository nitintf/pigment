import {
  Canvas,
  Control,
  controlsUtils,
  Ellipse,
  FabricObject,
  type FabricObject as FabricObjectType,
  IText,
  Rect,
} from "fabric";
import { AligningGuidelines } from "fabric/extensions";
import { useCallback, useEffect, useRef, useState } from "react";

import { getFabricCanvas, setFabricCanvasRef, useStudioStore } from "../store/studio-store";
import { useTabStore } from "../store/tab-store";
import { findParentFrame, moveFrameChildren, setParentId } from "../utils/frame-helpers";

import * as canvasApi from "@/lib/api/canvas";
import { cn } from "@/lib/utils";

let objectCounter = 0;

function generateId(): string {
  objectCounter += 1;
  return `obj-${String(objectCounter)}-${String(Date.now())}`;
}

/** Parse a CSS hex colour and return perceived luminance (0 = dark, 1 = bright). */
function hexLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Determine the best text colour for a given point on the canvas.
 * Checks every object at that point (excluding IText instances) for
 * a fill colour, picks the topmost one, and returns black if it is
 * light, white otherwise.
 */
function pickTextColorAtPoint(canvas: Canvas, x: number, y: number): string {
  const objects = canvas.getObjects();
  // Walk from top of stack → bottom; first opaque hit wins
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj instanceof IText) continue;
    const bounds = obj.getBoundingRect();
    const inside =
      x >= bounds.left &&
      x <= bounds.left + bounds.width &&
      y >= bounds.top &&
      y <= bounds.top + bounds.height;
    if (!inside) continue;
    const fill = obj.fill;
    if (typeof fill === "string" && fill.startsWith("#") && fill.length >= 7) {
      return hexLuminance(fill) > 0.5 ? "#000000" : "#ffffff";
    }
  }
  // No object under the point → drawing on the dark canvas
  return "#ffffff";
}

function getNextFrameName(canvas: Canvas): string {
  const usedNumbers = new Set<number>();
  for (const obj of canvas.getObjects()) {
    const custom = obj as unknown as { isFrame?: boolean; name?: string };
    if (custom.isFrame && custom.name) {
      const match = /^Frame (\d+)$/.exec(custom.name);
      if (match) {
        usedNumbers.add(Number(match[1]));
      }
    }
  }
  let n = 1;
  while (usedNumbers.has(n)) {
    n++;
  }
  return `Frame ${String(n)}`;
}

function getId(obj: FabricObjectType): string {
  return (obj as unknown as { id?: string }).id ?? "";
}

// Figma-like selection control styling: corners only, no mid-edge handles, no rotate control
function applyFigmaControlDefaults(): void {
  const defaults = FabricObject.ownDefaults;
  defaults.borderColor = "#4f8ef7";
  defaults.borderScaleFactor = 1.5;
  defaults.cornerColor = "#ffffff";
  defaults.cornerStrokeColor = "#4f8ef7";
  defaults.cornerSize = 6;
  defaults.cornerStyle = "rect";
  defaults.transparentCorners = false;
  defaults.borderOpacityWhenMoving = 0.6;
  defaults.padding = 0;

  // Override the per-instance control factory:
  //  - Remove mid-edge and standalone rotate handles
  //  - Add invisible rotation controls just outside each corner (Figma-style)
  const _origCreateControls = FabricObject.createControls.bind(FabricObject);
  FabricObject.createControls = function () {
    const result = _origCreateControls();
    delete result.controls.ml;
    delete result.controls.mr;
    delete result.controls.mt;
    delete result.controls.mb;
    delete result.controls.mtr;

    // Invisible rotation zones at each corner, offset outward
    const rotOffset = 10;
    const corners = [
      { key: "tlr", x: -0.5, y: -0.5, ox: -rotOffset, oy: -rotOffset },
      { key: "trr", x: 0.5, y: -0.5, ox: rotOffset, oy: -rotOffset },
      { key: "blr", x: -0.5, y: 0.5, ox: -rotOffset, oy: rotOffset },
      { key: "brr", x: 0.5, y: 0.5, ox: rotOffset, oy: rotOffset },
    ];
    for (const c of corners) {
      result.controls[c.key] = new Control({
        x: c.x,
        y: c.y,
        offsetX: c.ox,
        offsetY: c.oy,
        sizeX: 18,
        sizeY: 18,
        actionHandler: controlsUtils.rotationWithSnapping,
        cursorStyleHandler: controlsUtils.rotationStyleHandler,
        actionName: "rotate",
        render: () => {
          /* invisible */
        },
      });
    }

    return result;
  };
}

applyFigmaControlDefaults();

interface CanvasContextMenu {
  x: number;
  y: number;
  targetId: string;
}

export function StudioCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeShapeRef = useRef<FabricObjectType | null>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const spaceHeldRef = useRef(false);
  const isRestoringRef = useRef(false);
  const framePosRef = useRef<Map<string, { left: number; top: number }>>(new Map());
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const isTextEditingRef = useRef(false);
  const clipboardRef = useRef<FabricObjectType | null>(null);

  const handleResize = useCallback(() => {
    const canvas = fabricRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    const { width, height } = container.getBoundingClientRect();
    canvas.setDimensions({ width, height });
    canvas.requestRenderAll();
  }, []);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const container = containerRef.current;
    if (!canvasEl || !container) {
      return;
    }

    // Capture tab ID at mount time so cleanup saves to the correct tab
    const tabId = useTabStore.getState().activeTabId;

    const { width, height } = container.getBoundingClientRect();
    const actions = useStudioStore.getState().actions;

    const canvas = new Canvas(canvasEl, {
      width,
      height,
      backgroundColor: "#222",
      selection: true,
      preserveObjectStacking: true,
      uniformScaling: false,
      // Figma-like selection area styling
      selectionBorderColor: "#4f8ef7",
      selectionColor: "rgba(79, 142, 247, 0.08)",
      selectionLineWidth: 1,
    });

    fabricRef.current = canvas;
    setFabricCanvasRef(canvas);

    // Smart alignment guides (Figma-style snapping lines)
    const aligningGuidelines = new AligningGuidelines(canvas, {
      margin: 8,
      color: "rgba(255, 56, 56, 0.9)",
      width: 1,
    });

    // Clear store state for the fresh canvas
    actions.setSelectedIds([]);
    actions.setZoom(1);

    // Restore saved canvas state from SQLite
    isRestoringRef.current = true;
    void canvasApi.getCanvasState(tabId).then((saved) => {
      if (!fabricRef.current) return;

      if (saved && saved.canvasJson !== "{}") {
        const viewportTransform = JSON.parse(saved.viewportTransform) as number[];
        void canvas.loadFromJSON(saved.canvasJson).then(() => {
          if (!fabricRef.current) return;
          isRestoringRef.current = false;
          canvas.setViewportTransform(
            viewportTransform as [number, number, number, number, number, number],
          );
          canvas.setZoom(saved.zoom);
          canvas.requestRenderAll();
          actions.syncObjectsFromCanvas();
          actions.setZoom(Math.round(saved.zoom * 100) / 100);
        });
      } else {
        isRestoringRef.current = false;
        actions.syncObjectsFromCanvas();
      }
    });

    canvas.on("object:added", () => actions.syncObjectsFromCanvas());
    canvas.on("object:removed", () => actions.syncObjectsFromCanvas());
    canvas.on("object:modified", (e) => {
      // Auto-parent: check if non-frame object landed inside a frame
      const target = e.target;
      if (target && !(target as unknown as { isFrame?: boolean }).isFrame) {
        const newParentId = findParentFrame(canvas, target);
        const currentParentId = (target as unknown as { parentId?: string }).parentId;
        if (newParentId !== currentParentId) {
          setParentId(target, newParentId);
        }
      }
      actions.syncObjectsFromCanvas();
    });

    // Frame-moves-children: when a frame is dragged, move all its children
    canvas.on("object:moving", (e) => {
      const target = e.target;
      const custom = target as unknown as { id?: string; isFrame?: boolean };
      if (!custom.isFrame || !custom.id) return;

      const prevPos = framePosRef.current.get(custom.id);
      const currentLeft = target.left ?? 0;
      const currentTop = target.top ?? 0;

      if (prevPos) {
        const dx = currentLeft - prevPos.left;
        const dy = currentTop - prevPos.top;
        if (dx !== 0 || dy !== 0) {
          moveFrameChildren(canvas, custom.id, dx, dy);
        }
      }

      framePosRef.current.set(custom.id, { left: currentLeft, top: currentTop });
    });

    // Render frame labels above frame objects
    canvas.on("after:render", () => {
      const ctx = canvas.getContext();
      const vpt = canvas.viewportTransform;
      const zoom = canvas.getZoom();
      for (const obj of canvas.getObjects()) {
        if (!(obj as unknown as { isFrame?: boolean }).isFrame) continue;
        const name = (obj as unknown as { name?: string }).name ?? "Frame";
        // Transform scene coords to screen coords
        const sceneLeft = obj.left ?? 0;
        const sceneTop = obj.top ?? 0;
        const screenX = sceneLeft * vpt[0] + vpt[4];
        const screenY = sceneTop * vpt[3] + vpt[5];
        ctx.save();
        const fontSize = Math.max(11, Math.min(14, 11 / zoom));
        ctx.font = `${String(fontSize)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "#999";
        ctx.fillText(name, screenX, screenY - 8);
        ctx.restore();
      }
    });

    canvas.on("selection:created", (e) => {
      const ids = (e.selected ?? []).map((obj) => getId(obj)).filter(Boolean);
      actions.setSelectedIds(ids);
      actions.openRightPanel();
    });
    canvas.on("selection:updated", (e) => {
      const ids = (e.selected ?? []).map((obj) => getId(obj)).filter(Boolean);
      actions.setSelectedIds(ids);
      actions.openRightPanel();
    });
    canvas.on("selection:cleared", () => {
      actions.setSelectedIds([]);
      actions.closeRightPanel();
    });

    canvas.on("mouse:move", (e) => {
      const pointer = canvas.getScenePoint(e.e);
      actions.setCursorPosition({ x: Math.round(pointer.x), y: Math.round(pointer.y) });

      if (isPanningRef.current && lastPanPointRef.current) {
        const me = e.e as MouseEvent;
        const vpt = [...canvas.viewportTransform] as [
          number,
          number,
          number,
          number,
          number,
          number,
        ];
        vpt[4] += me.clientX - lastPanPointRef.current.x;
        vpt[5] += me.clientY - lastPanPointRef.current.y;
        canvas.setViewportTransform(vpt);
        lastPanPointRef.current = { x: me.clientX, y: me.clientY };
        return;
      }

      if (isDrawingRef.current && drawStartRef.current && activeShapeRef.current) {
        const p = canvas.getScenePoint(e.e);
        const tool = useStudioStore.getState().activeTool;

        if (tool === "rectangle" || tool === "frame") {
          const rect = activeShapeRef.current as Rect;
          rect.set({
            left: Math.min(drawStartRef.current.x, p.x),
            top: Math.min(drawStartRef.current.y, p.y),
            width: Math.abs(p.x - drawStartRef.current.x),
            height: Math.abs(p.y - drawStartRef.current.y),
          });
        } else if (tool === "ellipse") {
          const ellip = activeShapeRef.current as Ellipse;
          const w = Math.abs(p.x - drawStartRef.current.x);
          const h = Math.abs(p.y - drawStartRef.current.y);
          ellip.set({
            left: Math.min(drawStartRef.current.x, p.x),
            top: Math.min(drawStartRef.current.y, p.y),
            rx: w / 2,
            ry: h / 2,
          });
        }
        canvas.requestRenderAll();
      }
    });

    canvas.on("mouse:wheel", (opt) => {
      const evt = opt.e;
      evt.preventDefault();
      evt.stopPropagation();

      // Pinch-to-zoom (ctrlKey is set by trackpad pinch gesture)
      if (evt.ctrlKey || evt.metaKey) {
        const delta = evt.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.977 ** delta;
        zoom = Math.min(Math.max(0.1, zoom), 20);
        canvas.zoomToPoint(canvas.getScenePoint(evt), zoom);
        actions.setZoom(Math.round(zoom * 100) / 100);
        return;
      }

      // Regular scroll = pan (infinite canvas) — use setViewportTransform to update coords
      const vpt = [...canvas.viewportTransform] as [number, number, number, number, number, number];
      vpt[4] -= evt.deltaX;
      vpt[5] -= evt.deltaY;
      canvas.setViewportTransform(vpt);
    });

    canvas.on("mouse:down", (e) => {
      // Right-click context menu
      const mouseEvent = e.e as MouseEvent;
      if (mouseEvent.button === 2 && e.target) {
        const targetId = (e.target as unknown as { id?: string }).id;
        if (targetId) {
          canvas.setActiveObject(e.target);
          actions.setSelectedIds([targetId]);
          setContextMenu({ x: mouseEvent.clientX, y: mouseEvent.clientY, targetId });
          return;
        }
      }

      // Dismiss context menu on any left-click
      setContextMenu(null);

      const tool = useStudioStore.getState().activeTool;

      if (tool === "hand" || spaceHeldRef.current) {
        isPanningRef.current = true;
        const me = e.e as MouseEvent;
        lastPanPointRef.current = { x: me.clientX, y: me.clientY };
        canvas.selection = false;
        canvas.setCursor("grabbing");
        return;
      }

      if (tool === "select") {
        // Capture initial frame position for delta tracking
        if (e.target) {
          const custom = e.target as unknown as { id?: string; isFrame?: boolean };
          if (custom.isFrame && custom.id) {
            framePosRef.current.set(custom.id, {
              left: e.target.left ?? 0,
              top: e.target.top ?? 0,
            });
          }
        }
        return;
      }

      const pointer = canvas.getScenePoint(e.e);

      if (tool === "text") {
        const id = generateId();
        const textColor = pickTextColorAtPoint(canvas, pointer.x, pointer.y);
        const text = new IText("Type something", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 16,
          fontFamily: "Inter, system-ui, sans-serif",
          fill: textColor,
          originX: "left",
          originY: "top",
          padding: 8,
          cursorWidth: 1,
        });
        (text as unknown as { id: string }).id = id;
        (text as unknown as { name: string }).name = `Text ${String(objectCounter)}`;
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        actions.setTool("select");
        return;
      }

      isDrawingRef.current = true;
      drawStartRef.current = { x: pointer.x, y: pointer.y };
      canvas.selection = false;
      // Disable interaction with existing objects while drawing
      canvas.discardActiveObject();
      for (const obj of canvas.getObjects()) {
        obj.set({ selectable: false, evented: false });
      }

      const id = generateId();

      if (tool === "frame") {
        const frameName = getNextFrameName(canvas);
        const frame = new Rect({
          left: pointer.x,
          top: pointer.y,
          originX: "left",
          originY: "top",
          width: 0,
          height: 0,
          fill: "#ffffff",
          stroke: "#e0e0e0",
          strokeWidth: 1,
          strokeUniform: true,
        });
        (frame as unknown as { id: string }).id = id;
        (frame as unknown as { name: string }).name = frameName;
        (frame as unknown as { isFrame: boolean }).isFrame = true;
        canvas.add(frame);
        activeShapeRef.current = frame;
      } else if (tool === "rectangle") {
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          originX: "left",
          originY: "top",
          width: 0,
          height: 0,
          fill: "#d9d9d9",
          stroke: "#b3b3b3",
          strokeWidth: 1,
          strokeUniform: true,
        });
        (rect as unknown as { id: string }).id = id;
        (rect as unknown as { name: string }).name = `Rectangle ${String(objectCounter)}`;
        canvas.add(rect);
        activeShapeRef.current = rect;
      } else if (tool === "ellipse") {
        const ellip = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          originX: "left",
          originY: "top",
          rx: 0,
          ry: 0,
          fill: "#d9d9d9",
          stroke: "#b3b3b3",
          strokeWidth: 1,
          strokeUniform: true,
        });
        (ellip as unknown as { id: string }).id = id;
        (ellip as unknown as { name: string }).name = `Ellipse ${String(objectCounter)}`;
        canvas.add(ellip);
        activeShapeRef.current = ellip;
      }
    });

    canvas.on("mouse:up", () => {
      framePosRef.current.clear();

      if (isPanningRef.current) {
        isPanningRef.current = false;
        lastPanPointRef.current = null;
        const tool = useStudioStore.getState().activeTool;
        if (tool !== "hand") {
          canvas.selection = true;
        }
        canvas.setCursor("default");
        return;
      }

      if (isDrawingRef.current && activeShapeRef.current) {
        const shape = activeShapeRef.current;
        isDrawingRef.current = false;
        drawStartRef.current = null;

        // If shape is too small (click without drag), give it a default size
        const w = (shape.width ?? 0) * (shape.scaleX ?? 1);
        const h = (shape.height ?? 0) * (shape.scaleY ?? 1);
        const isFrame = (shape as unknown as { isFrame?: boolean }).isFrame;
        if (w < 2 && h < 2) {
          if (isFrame) {
            shape.set({ width: 375, height: 667 });
          } else {
            shape.set({ width: 100, height: 100 });
          }
          shape.setCoords();
        }

        // Re-enable interaction on all objects
        for (const obj of canvas.getObjects()) {
          obj.set({ selectable: true, evented: true });
        }
        canvas.setActiveObject(shape);
        activeShapeRef.current = null;
        canvas.selection = true;
        actions.setTool("select");
      }
    });

    // Snap-to-grid (10px grid)
    const GRID_SIZE = 10;
    let snapEnabled = false;

    // Expose snap toggle via store-accessible function
    const toggleSnap = () => {
      snapEnabled = !snapEnabled;
    };
    // Store the toggle on the canvas for external access
    (canvas as unknown as { _toggleSnap: () => void })._toggleSnap = toggleSnap;

    canvas.on("object:moving", (e) => {
      if (!snapEnabled) return;
      const target = e.target;
      target.set({
        left: Math.round((target.left ?? 0) / GRID_SIZE) * GRID_SIZE,
        top: Math.round((target.top ?? 0) / GRID_SIZE) * GRID_SIZE,
      });
    });

    // History: save canvas state for undo/redo
    function saveHistory() {
      if (isUndoRedoRef.current || isTextEditingRef.current) return;
      const json = JSON.stringify(
        canvas.toObject(["id", "name", "isFrame", "isComponent", "parentId"]),
      );
      // Trim future states if we're not at the end
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(json);
      // Cap at 50 states
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
      }
      historyIndexRef.current = historyRef.current.length - 1;
    }

    // Save initial history state (actual canvas load happens async above)
    saveHistory();

    // Skip expensive history saves while the user is actively typing
    canvas.on("text:editing:entered", () => {
      isTextEditingRef.current = true;
    });
    canvas.on("text:editing:exited", (e) => {
      isTextEditingRef.current = false;
      const textObj = e.target;
      if (textObj) {
        textObj.setCoords();
        canvas.requestRenderAll();
      }
      // Save one history snapshot now that editing is done
      saveHistory();
    });
    canvas.on("text:changed", (e) => {
      const textObj = e.target;
      if (textObj) {
        textObj.setCoords();
      }
    });

    // Save state after modifications
    canvas.on("object:modified", () => saveHistory());
    canvas.on("object:added", () => saveHistory());
    canvas.on("object:removed", () => saveHistory());

    function performUndo() {
      if (historyIndexRef.current <= 0) return;
      historyIndexRef.current -= 1;
      const json = historyRef.current[historyIndexRef.current];
      isUndoRedoRef.current = true;
      void canvas.loadFromJSON(json).then(() => {
        isUndoRedoRef.current = false;
        canvas.requestRenderAll();
        actions.syncObjectsFromCanvas();
      });
    }

    function performRedo() {
      if (historyIndexRef.current >= historyRef.current.length - 1) return;
      historyIndexRef.current += 1;
      const json = historyRef.current[historyIndexRef.current];
      isUndoRedoRef.current = true;
      void canvas.loadFromJSON(json).then(() => {
        isUndoRedoRef.current = false;
        canvas.requestRenderAll();
        actions.syncObjectsFromCanvas();
      });
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spaceHeldRef.current = true;
        canvas.setCursor("grab");
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Don't intercept shortcuts when typing in text
      const activeObj = canvas.getActiveObject();
      const isEditing = activeObj && (activeObj as unknown as { isEditing?: boolean }).isEditing;

      if (isMeta && !isEditing) {
        // Copy
        if (e.key === "c") {
          e.preventDefault();
          const obj = canvas.getActiveObject();
          if (obj) {
            void obj
              .clone(["id", "name", "isFrame", "isComponent", "parentId"])
              .then((cloned: FabricObjectType) => {
                clipboardRef.current = cloned;
              });
          }
        }

        // Cut
        if (e.key === "x") {
          e.preventDefault();
          const obj = canvas.getActiveObject();
          if (obj) {
            void obj
              .clone(["id", "name", "isFrame", "isComponent", "parentId"])
              .then((cloned: FabricObjectType) => {
                clipboardRef.current = cloned;
                canvas.remove(obj);
                canvas.discardActiveObject();
                canvas.requestRenderAll();
                actions.syncObjectsFromCanvas();
              });
          }
        }

        // Paste
        if (e.key === "v") {
          e.preventDefault();
          const clip = clipboardRef.current;
          if (clip) {
            void clip
              .clone(["id", "name", "isFrame", "isComponent", "parentId"])
              .then((cloned: FabricObjectType) => {
                cloned.set({
                  left: (cloned.left ?? 0) + 20,
                  top: (cloned.top ?? 0) + 20,
                });
                // Assign new unique id
                const newId = generateId();
                (cloned as unknown as { id: string }).id = newId;
                canvas.add(cloned);
                canvas.setActiveObject(cloned);
                canvas.requestRenderAll();
                actions.syncObjectsFromCanvas();
              });
          }
        }

        // Undo
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          performUndo();
        }

        // Redo
        if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          performRedo();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        canvas.setCursor("default");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Debounced auto-save: persist canvas to SQLite after modifications
    let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
    function scheduleAutoSave() {
      if (isRestoringRef.current || isUndoRedoRef.current) return;
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        if (!fabricRef.current) return;
        const json = JSON.stringify(
          canvas.toObject(["id", "name", "isFrame", "isComponent", "parentId"]),
        );
        const z = canvas.getZoom();
        const vt = JSON.stringify([...canvas.viewportTransform]);
        void canvasApi.saveCanvasState(tabId, json, z, vt);
      }, 2000);
    }

    canvas.on("object:modified", () => scheduleAutoSave());
    canvas.on("object:added", () => scheduleAutoSave());
    canvas.on("object:removed", () => scheduleAutoSave());

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      resizeObserver.disconnect();
      aligningGuidelines.dispose();

      if (autoSaveTimer) clearTimeout(autoSaveTimer);

      // Save canvas state on unmount (tab switch or close) unless mid-restore
      if (!isRestoringRef.current) {
        const json = JSON.stringify(
          canvas.toObject(["id", "name", "isFrame", "isComponent", "parentId"]),
        );
        const z = canvas.getZoom();
        const vt = JSON.stringify([...canvas.viewportTransform]);
        void canvasApi.saveCanvasState(tabId, json, z, vt);
      }

      fabricRef.current = null;
      setFabricCanvasRef(null);
      void canvas.dispose();
    };
  }, [handleResize]);

  // Close context menu on click-outside or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  function handleContextAction(action: string) {
    const canvas = getFabricCanvas();
    if (!canvas || !contextMenu) return;
    const actions = useStudioStore.getState().actions;

    const target = canvas
      .getObjects()
      .find((o) => (o as unknown as { id?: string }).id === contextMenu.targetId);

    switch (action) {
      case "duplicate": {
        if (!target) break;
        void target
          .clone(["id", "name", "isFrame", "isComponent", "parentId"])
          .then((cloned: FabricObjectType) => {
            cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
            (cloned as unknown as { id: string }).id = generateId();
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.requestRenderAll();
            actions.syncObjectsFromCanvas();
          });
        break;
      }
      case "delete": {
        if (!target) break;
        canvas.setActiveObject(target);
        actions.setSelectedIds([contextMenu.targetId]);
        actions.deleteSelected();
        break;
      }
      case "bring-front": {
        if (!target) break;
        canvas.bringObjectToFront(target);
        canvas.requestRenderAll();
        actions.syncObjectsFromCanvas();
        break;
      }
      case "send-back": {
        if (!target) break;
        canvas.sendObjectToBack(target);
        canvas.requestRenderAll();
        actions.syncObjectsFromCanvas();
        break;
      }
    }

    setContextMenu(null);
  }

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0", className)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} />

      {/* Canvas object context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[160px] rounded-lg border border-[#333] bg-[#252525] py-1 shadow-lg shadow-black/40"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-[#ccc] transition-colors hover:bg-[#333] hover:text-white"
            onClick={() => handleContextAction("duplicate")}
          >
            Duplicate
          </button>
          <button
            className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-[#ccc] transition-colors hover:bg-[#333] hover:text-white"
            onClick={() => handleContextAction("bring-front")}
          >
            Bring to Front
          </button>
          <button
            className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-[#ccc] transition-colors hover:bg-[#333] hover:text-white"
            onClick={() => handleContextAction("send-back")}
          >
            Send to Back
          </button>
          <div className="my-1 h-px bg-[#333]" />
          <button
            className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-red-400 transition-colors hover:bg-[#333] hover:text-red-300"
            onClick={() => handleContextAction("delete")}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
