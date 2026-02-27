import { Circle, Frame, Hand, MousePointer2, Square, Type, type LucideIcon } from "lucide-react";

import type { ToolType } from "../types";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<ToolType, LucideIcon> = {
  select: MousePointer2,
  rectangle: Square,
  ellipse: Circle,
  text: Type,
  frame: Frame,
  hand: Hand,
};

const LABEL_MAP: Record<ToolType, string> = {
  select: "Select (V)",
  rectangle: "Rectangle (R)",
  ellipse: "Ellipse (O)",
  text: "Text (T)",
  frame: "Frame (F)",
  hand: "Hand (H)",
};

interface StudioToolbarButtonProps {
  tool: ToolType;
  active?: boolean;
  className?: string;
  onToolSelect?: (tool: ToolType) => void;
}

export function StudioToolbarButton({
  tool,
  active = false,
  className,
  onToolSelect,
}: StudioToolbarButtonProps) {
  const Icon = ICON_MAP[tool];
  const label = LABEL_MAP[tool];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg text-[#808080] transition-colors hover:bg-[#252525] hover:text-[#ccc]",
            active && "bg-[#252525] text-[#fff]",
            className,
          )}
          onClick={() => onToolSelect?.(tool)}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
