import {
  Circle,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  Frame,
  Hand,
  Keyboard,
  Laptop,
  MessageSquare,
  MousePointer2,
  PanelLeft,
  Redo2,
  Settings,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  Tablet,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback } from "react";

import { useStudioStore } from "../store/studio-store";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useChatStore } from "@/features/chat/store/chat-store";

interface StudioCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
}

export function StudioCommandMenu({ open, onOpenChange, onOpenSettings }: StudioCommandMenuProps) {
  const setTool = useStudioStore((s) => s.actions.setTool);
  const toggleLeftSidebar = useStudioStore((s) => s.actions.toggleLeftSidebar);
  const toggleRightPanel = useStudioStore((s) => s.actions.toggleRightPanel);
  const deleteSelected = useStudioStore((s) => s.actions.deleteSelected);
  const zoomIn = useStudioStore((s) => s.actions.zoomIn);
  const zoomOut = useStudioStore((s) => s.actions.zoomOut);
  const zoomTo = useStudioStore((s) => s.actions.zoomTo);
  const toggleChat = useChatStore((s) => s.actions.toggleChat);

  const run = useCallback(
    (fn: () => void) => {
      fn();
      onOpenChange(false);
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} showCloseButton={false} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search commands..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>

        <CommandGroup heading="Tools">
          <CommandItem onSelect={() => run(() => setTool("select"))}>
            <MousePointer2 />
            <span>Select</span>
            <CommandShortcut>V</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTool("rectangle"))}>
            <Square />
            <span>Rectangle</span>
            <CommandShortcut>R</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTool("ellipse"))}>
            <Circle />
            <span>Ellipse</span>
            <CommandShortcut>O</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTool("text"))}>
            <Type />
            <span>Text</span>
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTool("frame"))}>
            <Frame />
            <span>Frame</span>
            <CommandShortcut>F</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTool("hand"))}>
            <Hand />
            <span>Hand</span>
            <CommandShortcut>H</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Edit">
          <CommandItem
            onSelect={() =>
              run(() => {
                document.execCommand("undo");
              })
            }
          >
            <Undo2 />
            <span>Undo</span>
            <CommandShortcut>{"\u2318Z"}</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                document.execCommand("redo");
              })
            }
          >
            <Redo2 />
            <span>Redo</span>
            <CommandShortcut>{"\u2318\u21E7Z"}</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                document.execCommand("copy");
              })
            }
          >
            <ClipboardCopy />
            <span>Copy</span>
            <CommandShortcut>{"\u2318C"}</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                document.execCommand("paste");
              })
            }
          >
            <ClipboardPaste />
            <span>Paste</span>
            <CommandShortcut>{"\u2318V"}</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                /* duplicate — placeholder */
              })
            }
          >
            <Copy />
            <span>Duplicate</span>
            <CommandShortcut>{"\u2318D"}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(deleteSelected)}>
            <Trash2 />
            <span>Delete Selection</span>
            <CommandShortcut>{"\u232B"}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="AI">
          <CommandItem onSelect={() => run(toggleChat)}>
            <Sparkles />
            <span>Toggle AI Chat</span>
            <CommandShortcut>{"\u2318J"}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(toggleChat)}>
            <MessageSquare />
            <span>New AI Conversation</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="View">
          <CommandItem onSelect={() => run(toggleLeftSidebar)}>
            <PanelLeft />
            <span>Toggle Layers</span>
            <CommandShortcut>{"\u2318\\"}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(toggleRightPanel)}>
            <SlidersHorizontal />
            <span>Toggle Properties</span>
            <CommandShortcut>{"\u2318."}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(zoomIn)}>
            <ZoomIn />
            <span>Zoom In</span>
            <CommandShortcut>{"\u2318+"}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(zoomOut)}>
            <ZoomOut />
            <span>Zoom Out</span>
            <CommandShortcut>{"\u2318-"}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => zoomTo(1))}>
            <ZoomIn />
            <span>Zoom to 100%</span>
            <CommandShortcut>{"\u23180"}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => zoomTo(0.5))}>
            <ZoomOut />
            <span>Zoom to 50%</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => zoomTo(2))}>
            <ZoomIn />
            <span>Zoom to 200%</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Frame Presets">
          <CommandItem onSelect={() => run(() => setTool("frame"))}>
            <Laptop />
            <span>Desktop Frame (1440 &times; 900)</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTool("frame"))}>
            <Tablet />
            <span>Tablet Frame (768 &times; 1024)</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTool("frame"))}>
            <Smartphone />
            <span>Mobile Frame (375 &times; 812)</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="System">
          <CommandItem
            onSelect={() =>
              run(() => {
                onOpenSettings?.();
              })
            }
          >
            <Settings />
            <span>Settings</span>
            <CommandShortcut>{"\u2318,"}</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => onOpenChange(false))}>
            <Keyboard />
            <span>Keyboard Shortcuts</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
