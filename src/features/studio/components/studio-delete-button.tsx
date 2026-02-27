import { Trash2 } from "lucide-react";

import { useStudioStore } from "../store/studio-store";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function StudioDeleteButton({ className }: { className?: string }) {
  const selectedIds = useStudioStore((s) => s.selectedObjectIds);
  const deleteSelected = useStudioStore((s) => s.actions.deleteSelected);
  const hasSelection = selectedIds.length > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label="Delete (Del)"
          className={cn(
            "flex size-8 items-center justify-center rounded-lg transition-colors",
            hasSelection
              ? "text-red-400 hover:bg-red-500/20 hover:text-red-300"
              : "cursor-not-allowed text-[#555]",
            className,
          )}
          disabled={!hasSelection}
          onClick={deleteSelected}
        >
          <Trash2 className="size-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        Delete (Del)
      </TooltipContent>
    </Tooltip>
  );
}
