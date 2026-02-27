import { motion } from "motion/react";
import { Children, cloneElement, isValidElement } from "react";

import { useTools } from "../hooks/use-tools";
import { useStudioStore } from "../store/studio-store";

import type { ToolType } from "../types";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StudioToolbarProps {
  children?: ReactNode;
  className?: string;
}

export function StudioToolbar({ children, className }: StudioToolbarProps) {
  const { activeTool, setTool } = useTools();
  const leftSidebarOpen = useStudioStore((s) => s.leftSidebarOpen);

  // When layers sidebar is open (220px), toolbar goes to 220+6=226px from left
  // When closed, toolbar goes to 6px from left
  const leftOffset = leftSidebarOpen ? 226 : 8;

  return (
    <motion.div
      animate={{ left: leftOffset }}
      className={cn(
        "absolute top-2 z-20 flex flex-col items-center gap-px rounded-lg bg-[#191919] p-1 shadow-lg shadow-black/30",
        className,
      )}
      transition={{ type: "tween", stiffness: 400, damping: 30 }}
    >
      {children ? applyToolProps(children, activeTool, setTool) : null}
    </motion.div>
  );
}

function applyToolProps(
  children: ReactNode,
  activeTool: ToolType,
  setTool: (tool: ToolType) => void,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;

    const props = child.props as Record<string, unknown>;

    // StudioToolbarButton — has a `tool` prop
    if (props.tool) {
      return cloneElement(
        child as React.ReactElement<{
          tool: ToolType;
          active: boolean;
          onToolSelect: (t: ToolType) => void;
        }>,
        {
          active: activeTool === (props.tool as ToolType),
          onToolSelect: setTool,
        },
      );
    }

    // StudioShapeMenu — has a `shapeMenu` prop marker
    if (props.shapeMenu) {
      return cloneElement(
        child as React.ReactElement<{
          active: boolean;
          onToolSelect: (t: ToolType) => void;
        }>,
        {
          active: activeTool === "rectangle" || activeTool === "ellipse",
          onToolSelect: setTool,
        },
      );
    }

    return child;
  });
}
