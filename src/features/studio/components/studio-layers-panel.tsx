import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Circle, Diamond, Frame, Layers, Square, Type } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLayers } from "../hooks/use-layers";
import { useStudioStore } from "../store/studio-store";

import { StudioLayerItem } from "./studio-layer-item";

import type { LayerTreeNode } from "../types";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type DropPosition = "above" | "inside" | "below";

const OVERLAY_ICONS: Record<string, ReactNode> = {
  component: <Diamond className="size-3" />,
  frame: <Frame className="size-3" />,
  rect: <Square className="size-3" />,
  ellipse: <Circle className="size-3" />,
  "i-text": <Type className="size-3" />,
};

export function StudioLayersPanel() {
  const leftSidebarOpen = useStudioStore((s) => s.leftSidebarOpen);
  const { layers, totalCount, toggleVisibility, selectObject, reparentObject } = useLayers();

  const [collapsedFrames, setCollapsedFrames] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);

  // Refs for continuous position tracking during drag
  const dropInfoRef = useRef<{ overId: string; position: DropPosition } | null>(null);
  const overIdRef = useRef<string | null>(null);
  const overRectRef = useRef<{ top: number; height: number } | null>(null);
  const prevPosRef = useRef<DropPosition | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setCollapsedFrames((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Flatten tree into ordered list of visible nodes for SortableContext
  const flatItems = useMemo(() => {
    const result: LayerTreeNode[] = [];
    function walk(nodes: LayerTreeNode[]) {
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0 && !collapsedFrames.has(node.id)) {
          walk(node.children);
        }
      }
    }
    walk(layers);
    return result;
  }, [layers, collapsedFrames]);

  const flatIds = useMemo(() => flatItems.map((n) => n.id), [flatItems]);
  const nodeMap = useMemo(() => new Map(flatItems.map((n) => [n.id, n])), [flatItems]);

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  // onDragOver only fires when the hovered droppable CHANGES.
  // We use it to detect WHICH element is hovered and store its rect.
  // Continuous position tracking (above/inside/below) happens in the
  // mousemove listener below.
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setOverId(null);
        setDropPosition(null);
        dropInfoRef.current = null;
        overIdRef.current = null;
        overRectRef.current = null;
        prevPosRef.current = null;
        return;
      }

      const targetId = String(over.id);
      if (targetId === activeId) {
        setOverId(null);
        setDropPosition(null);
        dropInfoRef.current = null;
        overIdRef.current = null;
        overRectRef.current = null;
        prevPosRef.current = null;
        return;
      }

      setOverId(targetId);
      overIdRef.current = targetId;
      overRectRef.current = { top: over.rect.top, height: over.rect.height };
      prevPosRef.current = null; // reset so mousemove recalculates
    },
    [activeId],
  );

  // Continuous mouse tracking during drag — calculates above/inside/below
  // on every pointer move, since onDragOver only fires on droppable change.
  useEffect(() => {
    if (!activeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const targetId = overIdRef.current;
      const rect = overRectRef.current;
      if (!targetId || !rect) return;

      const relY = e.clientY - rect.top;
      const ratio = relY / rect.height;

      let pos: DropPosition;
      if (ratio < 0.25) pos = "above";
      else if (ratio > 0.75) pos = "below";
      else pos = "inside";

      // Only update state when position actually changes
      if (pos !== prevPosRef.current) {
        prevPosRef.current = pos;
        setDropPosition(pos);
        dropInfoRef.current = { overId: targetId, position: pos };
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [activeId]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const sourceId = String(event.active.id);
      const info = dropInfoRef.current;

      // Reset all drag state
      setActiveId(null);
      setOverId(null);
      setDropPosition(null);
      dropInfoRef.current = null;
      overIdRef.current = null;
      overRectRef.current = null;
      prevPosRef.current = null;

      if (!info || sourceId === info.overId) return;

      reparentObject(sourceId, info.overId, info.position);
    },
    [reparentObject],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDropPosition(null);
    dropInfoRef.current = null;
    overIdRef.current = null;
    overRectRef.current = null;
    prevPosRef.current = null;
  }, []);

  const activeNode = activeId ? nodeMap.get(activeId) : null;

  return (
    <AnimatePresence>
      {leftSidebarOpen && (
        <motion.div
          animate={{ x: 0, opacity: 1 }}
          className="absolute left-0 top-0 bottom-0 z-10 flex w-[220px] flex-col border-r border-[#222] bg-[#191919]"
          exit={{ x: -220, opacity: 0 }}
          initial={{ x: -220, opacity: 0 }}
          transition={{ type: "tween", stiffness: 400, damping: 30 }}
        >
          <div className="flex h-8 flex-shrink-0 items-center gap-2 px-3">
            <Layers className="size-3.5 text-[#808080]" />
            <span className="text-[11px] font-medium text-[#808080]">Layers</span>
            <span className="ml-auto text-[10px] text-[#555]">{totalCount}</span>
          </div>
          <div className="border-t border-[#222]" />

          {totalCount === 0 ? (
            <div className="flex flex-1 items-start justify-center pt-6">
              <p className="text-[10px] text-[#555]">No layers yet</p>
            </div>
          ) : (
            <DndContext
              collisionDetection={pointerWithin}
              sensors={sensors}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
            >
              <ScrollArea className="flex-1">
                <div className="flex flex-col py-1">
                  <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
                    {flatItems.map((node) => {
                      const hasChildren = node.children.length > 0;
                      const isCollapsed = collapsedFrames.has(node.id);

                      return (
                        <StudioLayerItem
                          key={node.id}
                          depth={node.depth}
                          dropIndicator={
                            overId === node.id && dropPosition !== "inside" ? dropPosition : null
                          }
                          hasChildren={hasChildren}
                          id={node.id}
                          isComponent={node.isComponent}
                          isDropTarget={overId === node.id && dropPosition === "inside"}
                          isExpanded={!isCollapsed}
                          isFrame={node.isFrame}
                          name={node.name}
                          selected={node.selected}
                          type={node.type}
                          visible={node.visible}
                          onSelect={selectObject}
                          onToggleExpand={toggleExpand}
                          onToggleVisibility={toggleVisibility}
                        />
                      );
                    })}
                  </SortableContext>
                </div>
              </ScrollArea>

              {/* Drag overlay — floating preview that follows the cursor */}
              <DragOverlay dropAnimation={null}>
                {activeNode && (
                  <div className="flex h-7 items-center gap-1.5 rounded-md bg-[#252525] px-3 shadow-xl shadow-black/60 ring-1 ring-white/10">
                    <span
                      className={cn(
                        "flex-shrink-0",
                        activeNode.isComponent
                          ? "text-[#a78bfa]"
                          : activeNode.isFrame
                            ? "text-[#4f8ef7]"
                            : "text-[#999]",
                      )}
                    >
                      {OVERLAY_ICONS[
                        activeNode.isComponent
                          ? "component"
                          : activeNode.isFrame
                            ? "frame"
                            : activeNode.type
                      ] ?? <Square className="size-3" />}
                    </span>
                    <span
                      className={cn(
                        "truncate text-[10px]",
                        activeNode.isComponent
                          ? "font-medium text-[#a78bfa]"
                          : activeNode.isFrame
                            ? "font-medium text-[#e0e0e0]"
                            : "text-[#e0e0e0]",
                      )}
                    >
                      {activeNode.name}
                    </span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
