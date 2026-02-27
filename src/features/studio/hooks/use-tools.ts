import { useCallback, useEffect } from "react";

import { getFabricCanvas, useStudioStore } from "../store/studio-store";
import { type ToolType, TOOL_CONFIGS } from "../types";

const shortcutMap = new Map<string, ToolType>(
  TOOL_CONFIGS.map((t) => [t.shortcut.toLowerCase(), t.type]),
);

export function useTools() {
  const activeTool = useStudioStore((s) => s.activeTool);
  const setTool = useStudioStore((s) => s.actions.setTool);

  const handleToolChange = useCallback(
    (tool: ToolType) => {
      setTool(tool);
      const canvas = getFabricCanvas();
      if (!canvas) {
        return;
      }

      if (tool === "hand") {
        canvas.selection = false;
        canvas.setCursor("grab");
        canvas.forEachObject((obj) => {
          obj.selectable = false;
          obj.evented = false;
        });
      } else {
        canvas.selection = tool === "select";
        canvas.setCursor("default");
        canvas.forEachObject((obj) => {
          obj.selectable = true;
          obj.evented = true;
        });
      }
    },
    [setTool],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Delete/Backspace to delete selected objects
      if (e.key === "Delete" || e.key === "Backspace") {
        useStudioStore.getState().actions.deleteSelected();
        return;
      }

      const tool = shortcutMap.get(e.key.toLowerCase());
      if (tool) {
        handleToolChange(tool);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleToolChange]);

  return { activeTool, setTool: handleToolChange };
}
