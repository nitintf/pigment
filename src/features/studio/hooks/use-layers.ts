import { useCallback } from "react";

import { getFabricCanvas, useStudioStore } from "../store/studio-store";
import { setParentId } from "../utils/frame-helpers";

import type { LayerTreeNode, StudioObject } from "../types";
import type { FabricObject as FabricObjectType } from "fabric";

interface CustomObj {
  id?: string;
  isFrame?: boolean;
  isComponent?: boolean;
  parentId?: string;
}

function getObjectById(id: string) {
  const canvas = getFabricCanvas();
  if (!canvas) {
    return null;
  }
  return canvas.getObjects().find((obj) => (obj as unknown as CustomObj).id === id) ?? null;
}

/** Check if `ancestorId` is an ancestor of `objectId` in the parent chain */
function isDescendant(objects: StudioObject[], objectId: string, ancestorId: string): boolean {
  const objMap = new Map(objects.map((o) => [o.id, o]));
  let current = objMap.get(objectId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = objMap.get(current.parentId);
  }
  return false;
}

function buildLayerTree(objects: StudioObject[], selectedIds: string[]): LayerTreeNode[] {
  // Reverse to show topmost first (like Figma)
  const reversed = [...objects].reverse();

  // Build a map of parentId -> children
  const childrenMap = new Map<string | undefined, StudioObject[]>();
  for (const obj of reversed) {
    const parent = obj.parentId;
    if (!childrenMap.has(parent)) {
      childrenMap.set(parent, []);
    }
    childrenMap.get(parent)!.push(obj);
  }

  // Recursive builder
  function buildNodes(parentId: string | undefined, depth: number): LayerTreeNode[] {
    const children = childrenMap.get(parentId) ?? [];
    return children.map((obj) => ({
      ...obj,
      selected: selectedIds.includes(obj.id),
      depth,
      children: buildNodes(obj.id, depth + 1),
    }));
  }

  return buildNodes(undefined, 0);
}

export function useLayers() {
  const objects = useStudioStore((s) => s.objects);
  const selectedIds = useStudioStore((s) => s.selectedObjectIds);
  const updateObject = useStudioStore((s) => s.actions.updateObject);
  const syncObjects = useStudioStore((s) => s.actions.syncObjectsFromCanvas);

  const toggleVisibility = useCallback(
    (id: string) => {
      const obj = getObjectById(id);
      if (!obj) {
        return;
      }
      const newVisible = !obj.visible;
      obj.set("visible", newVisible);
      updateObject(id, { visible: newVisible });
      getFabricCanvas()?.requestRenderAll();
    },
    [updateObject],
  );

  const selectObject = useCallback((id: string) => {
    const canvas = getFabricCanvas();
    const obj = getObjectById(id);
    if (!canvas || !obj) {
      return;
    }
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  }, []);

  const deleteObject = useCallback(
    (id: string) => {
      const canvas = getFabricCanvas();
      const obj = getObjectById(id);
      if (!canvas || !obj) {
        return;
      }
      canvas.remove(obj);
      syncObjects();
    },
    [syncObjects],
  );

  const duplicateObject = useCallback(
    (id: string) => {
      const canvas = getFabricCanvas();
      const obj = getObjectById(id);
      if (!canvas || !obj) return;

      void obj
        .clone(["id", "name", "isFrame", "isComponent", "parentId"])
        .then((cloned: FabricObjectType) => {
          cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
          const newId = `obj-dup-${String(Date.now())}`;
          (cloned as unknown as { id: string }).id = newId;
          const origName = (cloned as unknown as { name?: string }).name ?? "Object";
          (cloned as unknown as { name: string }).name = `${origName} copy`;
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
          syncObjects();
        });
    },
    [syncObjects],
  );

  const renameObject = useCallback(
    (id: string, name: string) => {
      const canvas = getFabricCanvas();
      const obj = getObjectById(id);
      if (!canvas || !obj) return;

      (obj as unknown as { name: string }).name = name;
      updateObject(id, { name });
      canvas.requestRenderAll();
    },
    [updateObject],
  );

  const reparentObject = useCallback(
    (sourceId: string, targetId: string, position: "above" | "inside" | "below") => {
      const canvas = getFabricCanvas();
      if (!canvas) return;

      const sourceObj = getObjectById(sourceId);
      const targetObj = getObjectById(targetId);
      if (!sourceObj || !targetObj) return;

      const targetCustom = targetObj as unknown as CustomObj;

      // Prevent circular nesting: can't drop an element into its own descendant
      if (position === "inside" && isDescendant(objects, targetId, sourceId)) {
        return;
      }

      // Determine new parentId
      let newParentId: string | undefined;
      if (position === "inside") {
        newParentId = targetCustom.id;
      } else {
        newParentId = targetCustom.parentId;
      }

      // Set the parentId
      setParentId(sourceObj, newParentId);

      // Reorder z-index: temporarily disable renderOnAddRemove to avoid flicker
      const prevRender = canvas.renderOnAddRemove;
      canvas.renderOnAddRemove = false;

      // Remove source from current position
      canvas.remove(sourceObj);

      // Re-read objects after removal (indices shifted)
      const updatedObjects = canvas.getObjects();
      const newTargetIndex = updatedObjects.indexOf(targetObj);
      if (newTargetIndex === -1) {
        // Target got removed somehow — re-add source at end
        canvas.add(sourceObj);
        canvas.renderOnAddRemove = prevRender;
        canvas.requestRenderAll();
        syncObjects();
        return;
      }

      if (position === "above") {
        // "above" in layers UI (topmost first) = higher z-index = after target
        canvas.insertAt(newTargetIndex + 1, sourceObj);
      } else if (position === "below") {
        // "below" in layers UI = lower z-index = before target
        canvas.insertAt(newTargetIndex, sourceObj);
      } else {
        // "inside" — place just above the frame in z-order
        canvas.insertAt(newTargetIndex + 1, sourceObj);
      }

      canvas.renderOnAddRemove = prevRender;
      canvas.requestRenderAll();
      syncObjects();
    },
    [objects, syncObjects],
  );

  const layers = buildLayerTree(objects, selectedIds);

  return {
    layers,
    totalCount: objects.length,
    toggleVisibility,
    selectObject,
    deleteObject,
    duplicateObject,
    renameObject,
    reparentObject,
  };
}
