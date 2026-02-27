import type { Canvas, FabricObject } from "fabric";

interface CustomFabricObject extends FabricObject {
  id?: string;
  name?: string;
  isFrame?: boolean;
  parentId?: string;
}

/**
 * Check if a point is inside an object's axis-aligned bounding box.
 */
function isPointInsideObject(point: { x: number; y: number }, obj: FabricObject): boolean {
  const left = obj.left ?? 0;
  const top = obj.top ?? 0;
  const width = (obj.width ?? 0) * (obj.scaleX ?? 1);
  const height = (obj.height ?? 0) * (obj.scaleY ?? 1);
  return point.x >= left && point.x <= left + width && point.y >= top && point.y <= top + height;
}

/**
 * Find which frame contains an object's center point.
 * Searches in reverse z-order so the topmost frame wins.
 * Returns the frame's id, or undefined if no frame contains the point.
 */
export function findParentFrame(canvas: Canvas, target: FabricObject): string | undefined {
  const targetCenter = target.getCenterPoint();
  const targetId = (target as CustomFabricObject).id;

  const frames = canvas
    .getObjects()
    .filter((obj) => {
      const custom = obj as CustomFabricObject;
      return custom.isFrame && custom.id !== targetId;
    })
    .reverse();

  for (const frame of frames) {
    if (isPointInsideObject(targetCenter, frame)) {
      return (frame as CustomFabricObject).id;
    }
  }
  return undefined;
}

/**
 * Get all direct children of a frame.
 */
export function getChildrenOfFrame(canvas: Canvas, frameId: string): FabricObject[] {
  return canvas.getObjects().filter((obj) => {
    return (obj as CustomFabricObject).parentId === frameId;
  });
}

/**
 * Set or clear parentId on a fabric object.
 */
export function setParentId(obj: FabricObject, parentId: string | undefined): void {
  (obj as CustomFabricObject).parentId = parentId;
}

/**
 * Move all children of a frame by (dx, dy). Recurses into nested frames.
 */
export function moveFrameChildren(canvas: Canvas, frameId: string, dx: number, dy: number): void {
  const children = getChildrenOfFrame(canvas, frameId);
  for (const child of children) {
    child.set({
      left: (child.left ?? 0) + dx,
      top: (child.top ?? 0) + dy,
    });
    child.setCoords();
    // Recurse into nested frames
    const custom = child as CustomFabricObject;
    if (custom.isFrame && custom.id) {
      moveFrameChildren(canvas, custom.id, dx, dy);
    }
  }
}
