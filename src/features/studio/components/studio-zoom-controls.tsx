import { Minus, Plus } from "lucide-react";
import { motion } from "motion/react";

import { useStudioStore } from "../store/studio-store";

export function StudioZoomControls() {
  const zoom = useStudioStore((s) => s.zoom);
  const zoomIn = useStudioStore((s) => s.actions.zoomIn);
  const zoomOut = useStudioStore((s) => s.actions.zoomOut);
  const zoomTo = useStudioStore((s) => s.actions.zoomTo);
  const leftSidebarOpen = useStudioStore((s) => s.leftSidebarOpen);

  // When layers panel is open (220px), offset zoom controls to the right of it
  const leftOffset = leftSidebarOpen ? 220 + 12 : 12;

  return (
    <motion.div
      animate={{ left: leftOffset }}
      className="absolute bottom-3 z-20 flex items-center gap-0.5 rounded-lg bg-[#191919] px-1 py-0.5 shadow-lg shadow-black/30"
      transition={{ type: "tween", duration: 0.2 }}
    >
      <button
        className="flex size-6 items-center justify-center rounded text-[#808080] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
        onClick={zoomOut}
      >
        <Minus className="size-3" />
      </button>
      <button
        className="min-w-[42px] px-1 text-center text-[11px] tabular-nums text-[#808080] transition-colors hover:text-[#ccc]"
        onClick={() => zoomTo(1)}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        className="flex size-6 items-center justify-center rounded text-[#808080] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
        onClick={zoomIn}
      >
        <Plus className="size-3" />
      </button>
    </motion.div>
  );
}
