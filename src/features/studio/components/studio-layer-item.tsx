import { useSortable } from "@dnd-kit/sortable";
import { ChevronRight, Circle, Diamond, Eye, EyeOff, Frame, Square, Type } from "lucide-react";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StudioLayerItemProps {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  selected: boolean;
  depth?: number;
  isFrame?: boolean;
  isComponent?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  isDropTarget?: boolean;
  dropIndicator?: "above" | "below" | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleExpand?: (id: string) => void;
}

const TYPE_ICONS: Record<string, ReactNode> = {
  component: <Diamond className="size-3" />,
  frame: <Frame className="size-3" />,
  rect: <Square className="size-3" />,
  ellipse: <Circle className="size-3" />,
  "i-text": <Type className="size-3" />,
  i_text: <Type className="size-3" />,
  itext: <Type className="size-3" />,
  IText: <Type className="size-3" />,
};

export function StudioLayerItem({
  id,
  name,
  type,
  visible,
  selected,
  depth = 0,
  isFrame,
  isComponent,
  isExpanded,
  hasChildren,
  isDropTarget,
  dropIndicator,
  onSelect,
  onToggleVisibility,
  onToggleExpand,
}: StudioLayerItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });

  const iconKey = isComponent ? "component" : isFrame ? "frame" : type;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative flex h-7 items-center gap-1 rounded",
        "cursor-default hover:bg-[#252525]",
        selected && "bg-[#4f8ef7]/30 hover:bg-[#4f8ef7]/35",
        isDropTarget && "bg-[#4f8ef7]/20 ring-1 ring-inset ring-[#4f8ef7]",
        isDragging && "opacity-40",
      )}
      style={{ paddingLeft: `${String(4 + depth * 14)}px`, paddingRight: "4px" }}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect(id);
        }
      }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
    >
      {/* Drop indicator lines */}
      {dropIndicator === "above" && (
        <div className="pointer-events-none absolute -top-px right-1 left-1 h-0.5 rounded-full bg-[#4f8ef7]">
          <div className="absolute -left-0.5 -top-[3px] size-2 rounded-full border-2 border-[#4f8ef7] bg-[#191919]" />
        </div>
      )}
      {dropIndicator === "below" && (
        <div className="pointer-events-none absolute -bottom-px right-1 left-1 h-0.5 rounded-full bg-[#4f8ef7]">
          <div className="absolute -left-0.5 -top-[3px] size-2 rounded-full border-2 border-[#4f8ef7] bg-[#191919]" />
        </div>
      )}

      {/* Collapse/expand chevron for items with children */}
      {hasChildren ? (
        <button
          className="flex size-4 flex-shrink-0 items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.(id);
          }}
        >
          <ChevronRight
            className={cn(
              "size-3 text-[#888] transition-transform duration-150",
              isExpanded && "rotate-90",
            )}
          />
        </button>
      ) : (
        <span className="size-4 flex-shrink-0" />
      )}
      <span
        className={cn(
          "flex-shrink-0",
          isComponent ? "text-[#a78bfa]" : isFrame ? "text-[#4f8ef7]" : "text-[#999]",
        )}
      >
        {TYPE_ICONS[iconKey] ?? <Square className="size-3" />}
      </span>
      <span
        className={cn(
          "flex-1 truncate text-[10px]",
          isComponent ? "font-medium text-[#a78bfa]" : isFrame && "font-medium",
        )}
      >
        {name}
      </span>
      {isDropTarget && (
        <span className="flex-shrink-0 text-[9px] font-medium text-[#4f8ef7]">Move inside</span>
      )}
      <button
        className="flex size-5 flex-shrink-0 items-center justify-center opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility(id);
        }}
      >
        {visible ? (
          <Eye className="size-2.5 text-[#ccc]" />
        ) : (
          <EyeOff className="size-2.5 text-[#888]" />
        )}
      </button>
    </div>
  );
}
