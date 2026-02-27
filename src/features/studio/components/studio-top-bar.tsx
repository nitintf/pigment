import { LayoutGrid, Maximize2, PanelLeft, Plus, Settings, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useStudioStore } from "../store/studio-store";
import { useTabStore } from "../store/tab-store";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useChatStore } from "@/features/chat/store/chat-store";
import { cn } from "@/lib/utils";

interface StudioTopBarProps {
  className?: string;
  onOpenSettings?: () => void;
  onOpenGallery?: () => void;
}

export function StudioTopBar({ className, onOpenSettings, onOpenGallery }: StudioTopBarProps) {
  const leftSidebarOpen = useStudioStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useStudioStore((s) => s.actions.toggleLeftSidebar);

  const toggleChat = useChatStore((s) => s.actions.toggleChat);
  const chatOpen = useChatStore((s) => s.isOpen);

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const { addTab, closeTab, duplicateTab, setActiveTab, renameTab } = useTabStore((s) => s.actions);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editingTabId) return;
    // Delay focus so the Radix context menu can fully close first
    const timer = setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 80);
    return () => clearTimeout(timer);
  }, [editingTabId]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  function startRename(tabId: string, currentName: string) {
    setEditingTabId(tabId);
    setEditingName(currentName);
  }

  const commitRename = useCallback(() => {
    if (editingTabId && editingName.trim()) {
      void renameTab(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName("");
  }, [editingTabId, editingName, renameTab]);

  const cancelRename = useCallback(() => {
    setEditingTabId(null);
    setEditingName("");
  }, []);

  const handleBlur = useCallback(() => {
    blurTimerRef.current = setTimeout(() => {
      commitRename();
    }, 150);
  }, [commitRename]);

  return (
    <TooltipProvider delayDuration={400}>
      <div
        data-tauri-drag-region
        className={cn(
          "flex h-10 shrink-0 items-center border-b border-[#111] bg-[#191919]",
          className,
        )}
      >
        {/* Left: traffic light spacer + sidebar toggle + gallery */}
        <div className="flex flex-shrink-0 items-center gap-[2px] pl-[78px] pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex size-6 items-center justify-center rounded-md text-[#999] transition-colors hover:bg-[#252525] hover:text-[#ccc]",
                  leftSidebarOpen && "text-[#ccc]",
                )}
                onClick={toggleLeftSidebar}
              >
                <PanelLeft className="size-[15px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              <span>
                Layers <kbd className="ml-1 text-[10px] opacity-60">&#8984;\</kbd>
              </span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex size-6 items-center justify-center rounded-md text-[#999] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
                onClick={onOpenGallery}
              >
                <LayoutGrid className="size-[14px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              <span>
                Gallery <kbd className="ml-1 text-[10px] opacity-60">&#8984;G</kbd>
              </span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Tabs */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 px-1" data-tauri-drag-region="">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isEditing = editingTabId === tab.id;

            return (
              <ContextMenu key={tab.id}>
                <ContextMenuTrigger asChild>
                  <button
                    className={cn(
                      "group relative flex h-6 min-w-0 max-w-[180px] items-center gap-1.5 rounded-md px-2.5 text-[11px] tracking-[-0.01em] transition-all",
                      isActive
                        ? "bg-[#4f8ef7]/25 text-[#d4d4d4]"
                        : "text-[#666] hover:bg-[#222] hover:text-[#999]",
                    )}
                    onClick={() => {
                      if (isEditing) return;
                      setActiveTab(tab.id);
                    }}
                    onDoubleClick={() => startRename(tab.id, tab.name)}
                  >
                    {isEditing ? (
                      <input
                        ref={renameInputRef}
                        className="min-w-0 flex-1 truncate rounded border border-[#4f8ef7]/50 bg-[#1a1a1a] px-1 text-[11px] text-[#d4d4d4] outline-none ring-1 ring-[#4f8ef7]/30"
                        value={editingName}
                        onBlur={handleBlur}
                        onChange={(e) => setEditingName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                            commitRename();
                          }
                          if (e.key === "Escape") {
                            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                            cancelRename();
                          }
                          e.stopPropagation();
                        }}
                      />
                    ) : (
                      <span className="truncate">{tab.name}</span>
                    )}
                    <span
                      className={cn(
                        "flex size-[14px] flex-shrink-0 items-center justify-center rounded-sm transition-all hover:bg-white/10",
                        isActive
                          ? "text-[#8ab4f8] opacity-100 hover:text-white"
                          : "opacity-0 group-hover:opacity-100",
                      )}
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void closeTab(tab.id);
                      }}
                    >
                      <X className="size-[10px]" />
                    </span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-[160px] border-[#333] bg-[#252525]">
                  <ContextMenuItem
                    className="text-[12px] text-[#ccc] focus:bg-[#333] focus:text-white"
                    onSelect={() => startRename(tab.id, tab.name)}
                  >
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="text-[12px] text-[#ccc] focus:bg-[#333] focus:text-white"
                    onClick={() => void duplicateTab(tab.id)}
                  >
                    Duplicate
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-[#333]" />
                  <ContextMenuItem
                    className="text-[12px] text-red-400 focus:bg-[#333] focus:text-red-300"
                    onClick={() => void closeTab(tab.id)}
                  >
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex size-6 flex-shrink-0 items-center justify-center rounded-md text-[#555] transition-colors hover:bg-[#222] hover:text-[#aaa]"
                onClick={() => void addTab()}
              >
                <Plus className="size-[14px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              New Canvas
            </TooltipContent>
          </Tooltip>
          {/* Drag region fills remaining space */}
          <div className="flex-1" data-tauri-drag-region="" />
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-shrink-0 items-center gap-[2px] px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] transition-colors hover:bg-[#252525] hover:text-[#ccc]",
                  chatOpen ? "bg-[#4f8ef7]/20 text-[#8ab4f8]" : "text-[#999]",
                )}
                onClick={toggleChat}
              >
                <Sparkles className="size-[14px]" />
                <span>Agents</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              <span>
                AI Agents <kbd className="ml-1 text-[10px] opacity-60">&#8984;J</kbd>
              </span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex size-6 items-center justify-center rounded-md text-[#999] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
                onClick={onOpenSettings}
              >
                <Settings className="size-[14px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              <span>
                Settings <kbd className="ml-1 text-[10px] opacity-60">&#8984;,</kbd>
              </span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex size-6 items-center justify-center rounded-md text-[#999] transition-colors hover:bg-[#252525] hover:text-[#ccc]">
                <Maximize2 className="size-[14px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              Fullscreen
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
