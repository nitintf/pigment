import { StaticCanvas } from "fabric";

/**
 * Render a canvas JSON string into a small PNG data-URL thumbnail.
 * Uses an off-screen StaticCanvas (non-interactive) so it works without
 * the element being attached to the DOM.
 */
export function generateThumbnail(canvasJson: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!canvasJson || canvasJson === "{}") {
      resolve(null);
      return;
    }

    // Parse the JSON once so loadFromJSON receives an object (avoids double-parse).
    let parsed: unknown;
    try {
      parsed = JSON.parse(canvasJson) as unknown;
    } catch {
      resolve(null);
      return;
    }

    // Quick check: if there are no objects, skip rendering entirely.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("objects" in parsed) ||
      !Array.isArray((parsed as { objects?: unknown }).objects) ||
      (parsed as { objects: unknown[] }).objects.length === 0
    ) {
      resolve(null);
      return;
    }

    const WIDTH = 320;
    const HEIGHT = 200;

    const offscreen = document.createElement("canvas");
    offscreen.width = WIDTH;
    offscreen.height = HEIGHT;

    // StaticCanvas is the right choice for off-screen rendering — no DOM
    // attachment or interactive event wiring required.
    const fabricCanvas = new StaticCanvas(offscreen, {
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: "#222",
      renderOnAddRemove: false,
    });

    void fabricCanvas
      .loadFromJSON(canvasJson)
      .then(() => {
        const objects = fabricCanvas.getObjects();
        if (objects.length === 0) {
          void fabricCanvas.dispose();
          resolve(null);
          return;
        }

        // Calculate bounding box of all objects
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const obj of objects) {
          const bound = obj.getBoundingRect();
          minX = Math.min(minX, bound.left);
          minY = Math.min(minY, bound.top);
          maxX = Math.max(maxX, bound.left + bound.width);
          maxY = Math.max(maxY, bound.top + bound.height);
        }

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        if (contentWidth <= 0 || contentHeight <= 0) {
          void fabricCanvas.dispose();
          resolve(null);
          return;
        }

        const padding = 20;
        const scaleX = (WIDTH - padding * 2) / contentWidth;
        const scaleY = (HEIGHT - padding * 2) / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        fabricCanvas.setViewportTransform([
          scale,
          0,
          0,
          scale,
          WIDTH / 2 - centerX * scale,
          HEIGHT / 2 - centerY * scale,
        ]);
        fabricCanvas.renderAll();

        const dataUrl = offscreen.toDataURL("image/png");
        void fabricCanvas.dispose();
        resolve(dataUrl);
      })
      .catch((err: unknown) => {
        console.warn("[canvas-thumbnail] Failed to generate thumbnail:", err);
        void fabricCanvas.dispose();
        resolve(null);
      });
  });
}
