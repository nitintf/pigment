import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { Clock, Home, Import, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTabStore } from "../store/tab-store";

import type { CanvasMeta } from "@/lib/api/canvas";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as canvasApi from "@/lib/api/canvas";
import { generateThumbnail } from "@/lib/canvas-thumbnail";
import { formatRelativeTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

interface StudioGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CanvasPreview({ canvasId }: { canvasId: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    void canvasApi.getCanvasState(canvasId).then((state) => {
      if (!mountedRef.current) return;
      if (state && state.canvasJson !== "{}") {
        void generateThumbnail(state.canvasJson).then((url) => {
          if (mountedRef.current) {
            setThumbnail(url);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });
    return () => {
      mountedRef.current = false;
    };
  }, [canvasId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#1e1e1e]">
        <div className="size-4 animate-spin rounded-full border-2 border-[#444] border-t-[#888]" />
      </div>
    );
  }

  if (thumbnail) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-[#1e1e1e]">
        <img alt="Canvas preview" className="size-full object-contain" src={thumbnail} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#1e1e1e]">
      <span className="text-[10px] text-[#444]">Empty canvas</span>
    </div>
  );
}

type SidebarSection = "recent";

export function StudioGalleryDialog({ open, onOpenChange }: StudioGalleryDialogProps) {
  const [canvases, setCanvases] = useState<CanvasMeta[]>([]);
  const [search, setSearch] = useState("");
  const [activeSection] = useState<SidebarSection>("recent");
  const { addTab, setActiveTab, duplicateTab, closeTab } = useTabStore((s) => s.actions);

  const loadCanvases = useCallback(() => {
    void canvasApi.listCanvases().then(setCanvases);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadCanvases();
  }, [open, loadCanvases]);

  const filtered = search.trim()
    ? canvases.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : canvases;

  function handleOpenCanvas(id: string) {
    setActiveTab(id);
    onOpenChange(false);
  }

  function handleNewCanvas() {
    void addTab();
    onOpenChange(false);
  }

  function handleDuplicate(id: string) {
    void duplicateTab(id);
    onOpenChange(false);
  }

  function handleDelete(id: string) {
    void closeTab(id).then(loadCanvases);
  }

  function handleImportEasel() {
    void openFileDialog({
      multiple: false,
      filters: [{ name: "Easel", extensions: ["easel"] }],
    }).then((selected: string | null) => {
      if (!selected) return;
      void canvasApi.importEaselFile(selected).then((meta) => {
        setActiveTab(meta.id);
        onOpenChange(false);
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[80vh] min-w-[80vw] gap-0 overflow-hidden border-[#333] bg-[#141414] p-0"
      >
        <DialogTitle className="sr-only">Canvas Gallery</DialogTitle>

        {/* Left sidebar */}
        <div className="flex w-[200px] flex-shrink-0 flex-col border-r border-[#2a2a2a] bg-[#181818]">
          <div className="px-4 pt-5 pb-3">
            <h2 className="text-[13px] font-semibold text-[#e0e0e0]">Easel</h2>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            <button
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-[12px] transition-colors",
                activeSection === "recent"
                  ? "bg-[#4f8ef7]/15 text-[#8ab4f8]"
                  : "text-[#888] hover:bg-[#222] hover:text-[#ccc]",
              )}
            >
              <Home className="size-[14px]" />
              Recent
            </button>
          </nav>
          <div className="flex-1" />
          <div className="flex flex-col gap-1.5 border-t border-[#2a2a2a] px-4 py-3">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#4f8ef7]/15 py-1.5 text-[11px] text-[#8ab4f8] transition-colors hover:bg-[#4f8ef7]/25"
              onClick={handleNewCanvas}
            >
              <Plus className="size-3.5" />
              New Canvas
            </button>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-md py-1.5 text-[11px] text-[#888] transition-colors hover:bg-[#222] hover:text-[#ccc]"
              onClick={handleImportEasel}
            >
              <Import className="size-3.5" />
              Import .easel
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-[#2a2a2a] px-5 py-3">
            <Search className="size-4 flex-shrink-0 text-[#555]" />
            <input
              className="flex-1 bg-transparent text-[13px] text-[#ccc] placeholder-[#555] outline-none"
              placeholder="Search canvases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Grid */}
          <ScrollArea className="flex-1">
            <div className="p-5">
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#555]">
                Recent Canvases
              </h3>
              <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
                {/* New Canvas card */}
                <button
                  className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#3a3a3a] bg-[#1e1e1e] text-[#555] transition-colors hover:border-[#555] hover:bg-[#222] hover:text-[#999]"
                  onClick={handleNewCanvas}
                >
                  <Plus className="size-7" />
                  <span className="text-[12px]">New Canvas</span>
                </button>

                {filtered.map((canvas) => (
                  <ContextMenu key={canvas.id}>
                    <ContextMenuTrigger asChild>
                      <button
                        className="group flex h-[180px] flex-col overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] transition-all hover:border-[#444] hover:ring-1 hover:ring-[#4f8ef7]/30"
                        onClick={() => handleOpenCanvas(canvas.id)}
                      >
                        <CanvasPreview canvasId={canvas.id} />
                        {/* Info */}
                        <div className="flex w-full items-center gap-2 border-t border-[#2a2a2a] px-3 py-2.5">
                          <span className="flex-1 truncate text-left text-[12px] font-medium text-[#ccc]">
                            {canvas.name}
                          </span>
                          <span className="flex flex-shrink-0 items-center gap-1 text-[10px] text-[#555]">
                            <Clock className="size-3" />
                            {formatRelativeTime(canvas.updatedAt)}
                          </span>
                        </div>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="min-w-[160px] border-[#333] bg-[#252525]">
                      <ContextMenuItem
                        className="text-[12px] text-[#ccc] focus:bg-[#333] focus:text-white"
                        onClick={() => handleOpenCanvas(canvas.id)}
                      >
                        Open
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="text-[12px] text-[#ccc] focus:bg-[#333] focus:text-white"
                        onClick={() => handleDuplicate(canvas.id)}
                      >
                        Duplicate
                      </ContextMenuItem>
                      <ContextMenuSeparator className="bg-[#333]" />
                      <ContextMenuItem
                        className="text-[12px] text-red-400 focus:bg-[#333] focus:text-red-300"
                        onClick={() => handleDelete(canvas.id)}
                      >
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>

              {filtered.length === 0 && search.trim() && (
                <div className="py-12 text-center text-[13px] text-[#555]">
                  No canvases matching &quot;{search}&quot;
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
