import { Maximize2, PanelLeft, Plus, Settings, Sparkles, X } from "lucide-react";

import { useStudioStore } from "../store/studio-store";
import { useTabStore } from "../store/tab-store";

import { useChatStore } from "@/features/chat/store/chat-store";
import { cn } from "@/lib/utils";

interface StudioTopBarProps {
  className?: string;
  onOpenSettings?: () => void;
}

export function StudioTopBar({ className, onOpenSettings }: StudioTopBarProps) {
  const leftSidebarOpen = useStudioStore((s) => s.leftSidebarOpen);
  const toggleLeftSidebar = useStudioStore((s) => s.actions.toggleLeftSidebar);

  const toggleChat = useChatStore((s) => s.actions.toggleChat);
  const chatOpen = useChatStore((s) => s.isOpen);

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const { addTab, closeTab, setActiveTab } = useTabStore((s) => s.actions);

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "flex h-10 shrink-0 items-center border-b border-[#111] bg-[#191919]",
        className,
      )}
    >
      {/* Left: traffic light spacer + sidebar toggle */}
      <div className="flex flex-shrink-0 items-center pl-[78px] pr-1">
        <button
          className={cn(
            "flex size-6 items-center justify-center rounded-md text-[#666] transition-colors hover:bg-[#252525] hover:text-[#aaa]",
            leftSidebarOpen && "text-[#aaa]",
          )}
          onClick={toggleLeftSidebar}
        >
          <PanelLeft className="size-[15px]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex min-w-0 flex-1 items-center gap-0.5 px-1" data-tauri-drag-region="">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              className={cn(
                "group relative flex h-6 min-w-0 max-w-[180px] items-center gap-1.5 rounded-md px-2.5 text-[11px] tracking-[-0.01em] transition-all",
                isActive
                  ? "bg-[#4f8ef7]/25 text-[#d4d4d4]"
                  : "text-[#666] hover:bg-[#222] hover:text-[#999]",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="truncate">
                {tab.name}
                {tab.edited && <span className="ml-0.5 text-[#666]">&bull;</span>}
              </span>
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
                  closeTab(tab.id);
                }}
              >
                <X className="size-[10px]" />
              </span>
            </button>
          );
        })}
        <button
          className="flex size-6 flex-shrink-0 items-center justify-center rounded-md text-[#555] transition-colors hover:bg-[#222] hover:text-[#aaa]"
          onClick={addTab}
        >
          <Plus className="size-[14px]" />
        </button>
        {/* Drag region fills remaining space */}
        <div className="flex-1" data-tauri-drag-region="" />
      </div>

      {/* Right: action buttons */}
      <div className="flex flex-shrink-0 items-center gap-[2px] px-2">
        <button
          className={cn(
            "flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] transition-colors hover:bg-[#252525] hover:text-[#aaa]",
            chatOpen ? "bg-[#4f8ef7]/20 text-[#8ab4f8]" : "text-[#666]",
          )}
          onClick={toggleChat}
        >
          <Sparkles className="size-[14px]" />
          <span>Agents</span>
        </button>
        <button
          className="flex size-6 items-center justify-center rounded-md text-[#666] transition-colors hover:bg-[#252525] hover:text-[#aaa]"
          onClick={onOpenSettings}
        >
          <Settings className="size-[14px]" />
        </button>
        <button className="flex size-6 items-center justify-center rounded-md text-[#666] transition-colors hover:bg-[#252525] hover:text-[#aaa]">
          <Maximize2 className="size-[14px]" />
        </button>
      </div>
    </div>
  );
}
