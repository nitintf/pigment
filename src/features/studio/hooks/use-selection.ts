import { useCallback, useMemo } from "react";

import { getFabricCanvas, useStudioStore } from "../store/studio-store";

import type { ObjectProperties } from "../types";

const DEFAULT_PROPERTIES: ObjectProperties = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  fill: "#000000",
  stroke: "#000000",
  strokeWidth: 0,
  opacity: 1,
  cornerRadius: 0,
  objectType: "unknown",
  fontFamily: "Arial",
  fontSize: 20,
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "left",
  lineHeight: 1.16,
  charSpacing: 0,
};

export function useSelection() {
  const selectedIds = useStudioStore((s) => s.selectedObjectIds);
  // Subscribe to objects so properties recompute after syncObjectsFromCanvas
  const objects = useStudioStore((s) => s.objects);

  const properties: ObjectProperties | null = useMemo(() => {
    if (selectedIds.length !== 1) {
      return null;
    }

    const canvas = getFabricCanvas();
    if (!canvas) {
      return null;
    }

    const obj = canvas
      .getObjects()
      .find((o) => (o as unknown as { id?: string }).id === selectedIds[0]);
    if (!obj) {
      return null;
    }

    const isText = obj.type === "i-text" || obj.type === "text" || obj.type === "textbox";
    const textObj = isText ? (obj as unknown as Record<string, unknown>) : null;

    return {
      x: Math.round(obj.left ?? 0),
      y: Math.round(obj.top ?? 0),
      width: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
      height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
      rotation: Math.round(obj.angle ?? 0),
      fill: typeof obj.fill === "string" ? obj.fill : DEFAULT_PROPERTIES.fill,
      stroke: typeof obj.stroke === "string" ? obj.stroke : DEFAULT_PROPERTIES.stroke,
      strokeWidth: obj.strokeWidth ?? 0,
      opacity: obj.opacity ?? 1,
      cornerRadius: (obj as unknown as { rx?: number }).rx ?? 0,
      objectType: obj.type ?? "unknown",
      fontFamily: (textObj?.fontFamily as string) ?? DEFAULT_PROPERTIES.fontFamily,
      fontSize: (textObj?.fontSize as number) ?? DEFAULT_PROPERTIES.fontSize,
      fontWeight: String((textObj?.fontWeight as string | number) ?? DEFAULT_PROPERTIES.fontWeight),
      fontStyle: (textObj?.fontStyle as string) ?? DEFAULT_PROPERTIES.fontStyle,
      textAlign: (textObj?.textAlign as string) ?? DEFAULT_PROPERTIES.textAlign,
      lineHeight: (textObj?.lineHeight as number) ?? DEFAULT_PROPERTIES.lineHeight,
      charSpacing: (textObj?.charSpacing as number) ?? DEFAULT_PROPERTIES.charSpacing,
    };
  }, [selectedIds, objects]);

  const updateProperty = useCallback(
    (key: keyof ObjectProperties, value: number | string) => {
      if (selectedIds.length !== 1) {
        return;
      }

      const canvas = getFabricCanvas();
      if (!canvas) {
        return;
      }

      const obj = canvas
        .getObjects()
        .find((o) => (o as unknown as { id?: string }).id === selectedIds[0]);
      if (!obj) {
        return;
      }

      if (key === "width") {
        const currentWidth = obj.width ?? 1;
        obj.set("scaleX", (value as number) / currentWidth);
      } else if (key === "height") {
        const currentHeight = obj.height ?? 1;
        obj.set("scaleY", (value as number) / currentHeight);
      } else if (key === "x") {
        obj.set("left", value as number);
      } else if (key === "y") {
        obj.set("top", value as number);
      } else if (key === "rotation") {
        obj.set("angle", value as number);
      } else if (key === "cornerRadius") {
        obj.set("rx", value as number);
        obj.set("ry", value as number);
      } else {
        obj.set(key as string, value);
      }

      obj.setCoords();
      canvas.requestRenderAll();
      useStudioStore.getState().actions.syncObjectsFromCanvas();
    },
    [selectedIds],
  );

  return {
    hasSelection: selectedIds.length > 0,
    isSingleSelection: selectedIds.length === 1,
    properties,
    updateProperty,
  };
}
