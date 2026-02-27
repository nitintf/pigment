import { Circle, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ToolType } from "../types";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ShapeType = "rectangle" | "ellipse";

const SHAPES: { type: ShapeType; label: string; icon: typeof Square; shortcut: string }[] = [
  { type: "rectangle", label: "Rectangle", icon: Square, shortcut: "R" },
  { type: "ellipse", label: "Ellipse", icon: Circle, shortcut: "O" },
];

/** Combined shapes icon — overlapping square and circle */
function ShapesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" width="10" x="1" y="1" />
      <circle cx="12.5" cy="12.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

interface StudioShapeMenuProps {
  shapeMenu?: boolean;
  active?: boolean;
  onToolSelect?: (tool: ToolType) => void;
}

export function StudioShapeMenu({ active = false, onToolSelect }: StudioShapeMenuProps) {
  const [open, setOpen] = useState(false);
  const [lastShape, setLastShape] = useState<ShapeType>("rectangle");
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (shape: ShapeType) => {
      setLastShape(shape);
      setOpen(false);
      onToolSelect?.(shape);
    },
    [onToolSelect],
  );

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Shapes"
            className={cn(
              "flex size-7 items-center justify-center rounded-lg text-[#808080] transition-colors hover:bg-[#252525] hover:text-[#ccc]",
              active && "bg-[#252525] text-[#fff]",
            )}
            onClick={() => setOpen(!open)}
          >
            <ShapesIcon className="size-4" />
          </button>
        </TooltipTrigger>
        {!open && (
          <TooltipContent side="right" sideOffset={8}>
            Shapes
          </TooltipContent>
        )}
      </Tooltip>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-full top-0 z-50 ml-2 min-w-[160px] rounded-lg border border-[#222] bg-[#191919] py-1 shadow-lg shadow-black/40">
          {SHAPES.map((shape) => {
            const Icon = shape.icon;
            return (
              <button
                key={shape.type}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-[#252525]",
                  lastShape === shape.type ? "text-[#e0e0e0]" : "text-[#999]",
                )}
                onClick={() => handleSelect(shape.type)}
              >
                <Icon className="size-4" />
                <span className="flex-1">{shape.label}</span>
                <span className="text-[10px] text-[#555]">{shape.shortcut}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
