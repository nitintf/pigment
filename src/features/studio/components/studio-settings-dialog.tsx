import { Monitor, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface StudioSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = "general" | "ai";

export function StudioSettingsDialog({ open, onOpenChange }: StudioSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Local settings state — will be wired to persistence later
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [autoSave, setAutoSave] = useState(true);
  const [showGuides, setShowGuides] = useState(true);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Monitor className="size-4" /> },
    { id: "ai", label: "AI", icon: <Sparkles className="size-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Application settings and preferences</DialogDescription>
      </DialogHeader>
      <DialogContent className="max-w-[520px] gap-0 overflow-hidden p-0" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center border-b border-[#2a2a2a] px-5 py-3.5">
          <h2 className="text-[13px] font-medium text-[#d4d4d4]">Settings</h2>
        </div>

        <div className="flex min-h-[360px]">
          {/* Sidebar tabs */}
          <div className="flex w-[140px] flex-shrink-0 flex-col gap-0.5 border-r border-[#2a2a2a] p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors",
                  activeTab === tab.id
                    ? "bg-[#4f8ef7]/15 text-[#8ab4f8]"
                    : "text-[#888] hover:bg-[#222] hover:text-[#ccc]",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "general" && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#666]">
                    Canvas
                  </h3>

                  {/* Snap to Grid */}
                  <SettingsRow description="Snap objects to grid when moving" label="Snap to grid">
                    <ToggleSwitch checked={snapToGrid} onChange={setSnapToGrid} />
                  </SettingsRow>

                  {/* Grid Size */}
                  <SettingsRow description="Size of the grid in pixels" label="Grid size">
                    <div className="flex items-center gap-1.5">
                      <input
                        className="h-7 w-14 rounded-md bg-[#252525] px-2 text-center text-[12px] text-[#ccc] outline-none focus:ring-1 focus:ring-[#4f8ef7]/50"
                        max={100}
                        min={1}
                        type="number"
                        value={gridSize}
                        onChange={(e) => setGridSize(Number(e.target.value))}
                      />
                      <span className="text-[11px] text-[#666]">px</span>
                    </div>
                  </SettingsRow>

                  {/* Show Guides */}
                  <SettingsRow
                    description="Show alignment guides when moving objects"
                    label="Smart guides"
                  >
                    <ToggleSwitch checked={showGuides} onChange={setShowGuides} />
                  </SettingsRow>
                </div>

                <div className="h-px bg-[#2a2a2a]" />

                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#666]">
                    Behavior
                  </h3>

                  {/* Auto Save */}
                  <SettingsRow description="Automatically save changes" label="Auto-save">
                    <ToggleSwitch checked={autoSave} onChange={setAutoSave} />
                  </SettingsRow>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#666]">
                    AI Configuration
                  </h3>

                  {/* Default Model */}
                  <SettingsRow description="Model used for AI conversations" label="Default model">
                    <select className="h-7 rounded-md bg-[#252525] px-2 text-[12px] text-[#ccc] outline-none focus:ring-1 focus:ring-[#4f8ef7]/50">
                      <option value="claude-sonnet">Claude Sonnet 4.5</option>
                      <option value="claude-opus">Claude Opus 4.6</option>
                      <option value="gpt-4o">GPT-4o</option>
                    </select>
                  </SettingsRow>

                  {/* API Key */}
                  <SettingsRow description="Your API key for AI features" label="API key">
                    <input
                      className="h-7 w-[160px] rounded-md bg-[#252525] px-2 text-[12px] text-[#ccc] outline-none placeholder:text-[#555] focus:ring-1 focus:ring-[#4f8ef7]/50"
                      placeholder="sk-..."
                      type="password"
                    />
                  </SettingsRow>
                </div>

                <div className="h-px bg-[#2a2a2a]" />

                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#666]">
                    Agents
                  </h3>

                  {/* Max Parallel Agents */}
                  <SettingsRow
                    description="Maximum number of agents running concurrently"
                    label="Max parallel agents"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        className="h-7 w-14 rounded-md bg-[#252525] px-2 text-center text-[12px] text-[#ccc] outline-none focus:ring-1 focus:ring-[#4f8ef7]/50"
                        defaultValue={3}
                        max={10}
                        min={1}
                        type="number"
                      />
                    </div>
                  </SettingsRow>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] text-[#ccc]">{label}</span>
        <span className="text-[11px] text-[#555]">{description}</span>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      className={cn(
        "relative h-5 w-9 flex-shrink-0 rounded-full transition-colors",
        checked ? "bg-[#4f8ef7]" : "bg-[#333]",
      )}
      onClick={() => onChange(!checked)}
    >
      <div
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
