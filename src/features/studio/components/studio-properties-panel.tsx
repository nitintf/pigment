import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  ChevronRight,
  Component,
  Download,
  Eye,
  EyeOff,
  Frame,
  Italic,
  Laptop,
  PanelRightClose,
  PanelRightOpen,
  Smartphone,
  Tablet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSelection } from "../hooks/use-selection";
import { getFabricCanvas, useStudioStore } from "../store/studio-store";

import { StudioPropertyField } from "./studio-property-field";

import type { ObjectProperties } from "../types";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const FALLBACK_FONTS = [
  "Inter",
  "system-ui",
  "Arial",
  "Helvetica Neue",
  "Helvetica",
  "SF Pro Display",
  "SF Pro Text",
  "Segoe UI",
  "Roboto",
  "Noto Sans",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Menlo",
  "Monaco",
  "Verdana",
  "Trebuchet MS",
  "Lucida Grande",
  "Tahoma",
  "Palatino",
  "Gill Sans",
  "Futura",
  "Avenir",
  "Avenir Next",
  "Optima",
  "Baskerville",
  "Didot",
  "American Typewriter",
  "Rockwell",
  "Copperplate",
  "Papyrus",
  "Impact",
  "Comic Sans MS",
];

function useSystemFonts(): string[] {
  const [fonts, setFonts] = useState<string[]>(FALLBACK_FONTS);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const w = window as unknown as {
      queryLocalFonts?: () => Promise<{ family: string }[]>;
    };
    if (typeof w.queryLocalFonts === "function") {
      void w.queryLocalFonts().then((fontData: { family: string }[]) => {
        const families = [...new Set(fontData.map((f) => f.family))].sort((a, b) =>
          a.localeCompare(b),
        );
        if (families.length > 0) {
          setFonts(families);
        }
      });
    }
  }, []);

  return fonts;
}

const FONT_WEIGHTS = [
  { label: "Thin", value: "100" },
  { label: "Extra Light", value: "200" },
  { label: "Light", value: "300" },
  { label: "Regular", value: "normal" },
  { label: "Medium", value: "500" },
  { label: "Semi Bold", value: "600" },
  { label: "Bold", value: "bold" },
  { label: "Extra Bold", value: "800" },
  { label: "Black", value: "900" },
];

type PanelTab = "design" | "layer" | "export";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "design", label: "Design" },
  { id: "layer", label: "Layer" },
  { id: "export", label: "Export" },
];

interface FramePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: React.ComponentType<{ className?: string }>;
}

const FRAME_PRESETS: FramePreset[] = [
  { id: "desktop", label: "Desktop", width: 1440, height: 900, icon: Laptop },
  { id: "tablet", label: "Tablet", width: 768, height: 1024, icon: Tablet },
  { id: "mobile", label: "Mobile", width: 375, height: 812, icon: Smartphone },
];

export function StudioPropertiesPanel() {
  const rightPanelOpen = useStudioStore((s) => s.rightPanelOpen);
  const toggleRightPanel = useStudioStore((s) => s.actions.toggleRightPanel);
  const toggleComponent = useStudioStore((s) => s.actions.toggleComponent);
  const { isSingleSelection, properties, updateProperty } = useSelection();
  const objects = useStudioStore((s) => s.objects);
  const selectedIds = useStudioStore((s) => s.selectedObjectIds);
  const systemFonts = useSystemFonts();

  const [activeTab, setActiveTab] = useState<PanelTab>("design");
  const [fillVisible, setFillVisible] = useState(true);
  const [strokeVisible, setStrokeVisible] = useState(true);
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "jpeg">("png");
  const [exportScale, setExportScale] = useState(2);

  const selectedObject = isSingleSelection
    ? objects.find((o) => o.id === selectedIds[0])
    : undefined;

  const handleChange = (key: keyof ObjectProperties) => (value: string | number) => {
    updateProperty(key, value);
  };

  const isRect = properties?.objectType === "rect";
  const isEllipse = properties?.objectType === "ellipse";
  const isText =
    properties?.objectType === "i-text" ||
    properties?.objectType === "text" ||
    properties?.objectType === "textbox";
  const isFrame = selectedObject?.isFrame === true;

  const applyFramePreset = useCallback((preset: FramePreset) => {
    const canvas = getFabricCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    obj.set({ scaleX: 1, scaleY: 1, width: preset.width, height: preset.height });
    // Update name to include preset type (e.g. "Frame 1 — Desktop")
    const currentName = (obj as unknown as { name?: string }).name ?? "Frame";
    const baseName = currentName.replace(/ — (?:Desktop|Tablet|Mobile)$/, "");
    (obj as unknown as { name: string }).name = `${baseName} — ${preset.label}`;

    obj.setCoords();
    canvas.requestRenderAll();
    useStudioStore.getState().actions.syncObjectsFromCanvas();
  }, []);

  // Detect which preset is currently active based on frame dimensions
  const activePresetLabel = isFrame
    ? FRAME_PRESETS.find((p) => properties?.width === p.width && properties?.height === p.height)
        ?.label
    : undefined;

  const alignObject = useCallback(
    (alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => {
      const canvas = getFabricCanvas();
      if (!canvas) return;
      const obj = canvas.getActiveObject();
      if (!obj) return;

      const parentId = (obj as unknown as { parentId?: string }).parentId;
      let boundsLeft = 0;
      let boundsTop = 0;
      let boundsWidth = canvas.getWidth();
      let boundsHeight = canvas.getHeight();
      let useSceneCoords = false;

      if (parentId) {
        const parentFrame = canvas
          .getObjects()
          .find((o) => (o as unknown as { id?: string }).id === parentId);
        if (parentFrame) {
          boundsLeft = parentFrame.left ?? 0;
          boundsTop = parentFrame.top ?? 0;
          boundsWidth = (parentFrame.width ?? 0) * (parentFrame.scaleX ?? 1);
          boundsHeight = (parentFrame.height ?? 0) * (parentFrame.scaleY ?? 1);
          useSceneCoords = true;
        }
      }

      if (useSceneCoords) {
        const objWidth = (obj.width ?? 0) * (obj.scaleX ?? 1);
        const objHeight = (obj.height ?? 0) * (obj.scaleY ?? 1);

        switch (alignment) {
          case "left":
            obj.set("left", boundsLeft);
            break;
          case "center-h":
            obj.set("left", boundsLeft + (boundsWidth - objWidth) / 2);
            break;
          case "right":
            obj.set("left", boundsLeft + boundsWidth - objWidth);
            break;
          case "top":
            obj.set("top", boundsTop);
            break;
          case "center-v":
            obj.set("top", boundsTop + (boundsHeight - objHeight) / 2);
            break;
          case "bottom":
            obj.set("top", boundsTop + boundsHeight - objHeight);
            break;
        }
      } else {
        const bound = obj.getBoundingRect();

        switch (alignment) {
          case "left":
            obj.set("left", (obj.left ?? 0) - bound.left);
            break;
          case "center-h":
            obj.set("left", (obj.left ?? 0) - bound.left + (boundsWidth - bound.width) / 2);
            break;
          case "right":
            obj.set("left", (obj.left ?? 0) - bound.left + boundsWidth - bound.width);
            break;
          case "top":
            obj.set("top", (obj.top ?? 0) - bound.top);
            break;
          case "center-v":
            obj.set("top", (obj.top ?? 0) - bound.top + (boundsHeight - bound.height) / 2);
            break;
          case "bottom":
            obj.set("top", (obj.top ?? 0) - bound.top + boundsHeight - bound.height);
            break;
        }
      }

      obj.setCoords();
      canvas.requestRenderAll();
      useStudioStore.getState().actions.syncObjectsFromCanvas();
    },
    [],
  );

  const bringToFront = useCallback(() => {
    const canvas = getFabricCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.bringObjectToFront(obj);
    canvas.requestRenderAll();
    useStudioStore.getState().actions.syncObjectsFromCanvas();
  }, []);

  const sendToBack = useCallback(() => {
    const canvas = getFabricCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    canvas.sendObjectToBack(obj);
    canvas.requestRenderAll();
    useStudioStore.getState().actions.syncObjectsFromCanvas();
  }, []);

  const handleExport = useCallback(() => {
    const canvas = getFabricCanvas();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    if (exportFormat === "svg") {
      const svg = canvas.toSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedObject?.name ?? "export"}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const format = exportFormat === "jpeg" ? "jpeg" : "png";
      const dataUrl = canvas.toDataURL({
        format,
        quality: 1,
        multiplier: exportScale,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${selectedObject?.name ?? "export"}.${format}`;
      a.click();
    }
  }, [exportFormat, exportScale, selectedObject?.name]);

  const selectedIcon = isFrame ? Frame : Component;
  const SelectedIcon = selectedIcon;

  return (
    <>
      {/* Edge-anchored tab when panel is closed and an object is selected */}
      <AnimatePresence>
        {!rightPanelOpen && isSingleSelection && selectedObject && (
          <motion.div
            animate={{ x: 0, opacity: 1 }}
            className="absolute right-0 top-3 z-20 flex items-center gap-1 rounded-l-lg border border-r-0 border-[#2a2a2a] bg-[#191919]/95 py-1.5 pl-2.5 pr-1 shadow-lg shadow-black/20 backdrop-blur-sm"
            exit={{ x: 40, opacity: 0 }}
            initial={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Accent line */}
            <div
              className={cn(
                "absolute left-0 top-2 bottom-2 w-[2px] rounded-full",
                selectedObject?.isComponent ? "bg-[#a78bfa]" : "bg-[#4f8ef7]",
              )}
            />

            <SelectedIcon className="size-3.5 flex-shrink-0 text-[#555]" />
            <span className="max-w-[120px] truncate text-[11px] font-medium text-[#ccc]">
              {selectedObject.name}
            </span>

            {/* Divider */}
            <div className="mx-0.5 h-3.5 w-px bg-[#333]" />

            {/* Create Component */}
            <button
              className={cn(
                "flex size-6 items-center justify-center rounded-md transition-colors",
                selectedObject?.isComponent
                  ? "text-[#a78bfa] hover:bg-[#252525]"
                  : "text-[#555] hover:bg-[#252525] hover:text-[#a78bfa]",
              )}
              title={selectedObject?.isComponent ? "Detach Component" : "Create Component"}
              onClick={toggleComponent}
            >
              <Component className="size-3.5" />
            </button>

            {/* Open panel */}
            <button
              className="flex size-6 items-center justify-center rounded-md text-[#555] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
              title="Open Properties"
              onClick={toggleRightPanel}
            >
              <PanelRightOpen className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {rightPanelOpen && (
          <motion.div
            animate={{ x: 0, opacity: 1 }}
            className="absolute right-0 top-0 bottom-0 z-10 flex w-[260px] flex-col border-l border-[#222] bg-[#191919]"
            exit={{ x: 260, opacity: 0 }}
            initial={{ x: 260, opacity: 0 }}
            transition={{ type: "tween", stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex h-10 flex-shrink-0 items-center justify-between px-3">
              <div className="flex min-w-0 items-center gap-2">
                <SelectedIcon className="size-3.5 flex-shrink-0 text-[#808080]" />
                <span className="truncate text-xs font-medium text-[#e0e0e0]">
                  {selectedObject?.name ?? "No selection"}
                </span>
                {activePresetLabel && (
                  <span className="flex-shrink-0 rounded bg-[#4f8ef7]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#8ab4f8]">
                    {activePresetLabel}
                  </span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-0.5">
                <button
                  className={cn(
                    "flex size-5 items-center justify-center rounded transition-colors",
                    selectedObject?.isComponent
                      ? "text-[#a78bfa] hover:bg-[#252525]"
                      : "text-[#666] hover:bg-[#252525] hover:text-[#a78bfa]",
                  )}
                  title={selectedObject?.isComponent ? "Detach Component" : "Create Component"}
                  onClick={toggleComponent}
                >
                  <Component className="size-3" />
                </button>
                <button
                  className="flex size-5 items-center justify-center rounded text-[#666] hover:bg-[#252525] hover:text-[#999]"
                  onClick={toggleRightPanel}
                >
                  <PanelRightClose className="size-3" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-shrink-0 gap-1 border-t border-[#222] px-3 py-1.5">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-[#4f8ef7]/20 text-[#8ab4f8]"
                      : "text-[#666] hover:bg-[#252525] hover:text-[#999]",
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="border-t border-[#222]" />

            {/* Content */}
            {!isSingleSelection || !properties ? (
              <div className="flex flex-1 items-start justify-center pt-8">
                <p className="text-[11px] text-[#555]">Select an element to edit properties</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="flex flex-col">
                  {/* Design Tab */}
                  {activeTab === "design" && (
                    <>
                      {/* Frame Presets — only for frame objects */}
                      {isFrame && (
                        <div className="space-y-2 border-b border-[#222] px-3 py-3">
                          <p className="text-[10px] font-medium text-[#808080]">Frame Preset</p>
                          <div className="grid grid-cols-3 gap-1">
                            {FRAME_PRESETS.map((preset) => {
                              const PresetIcon = preset.icon;
                              const isActive =
                                properties?.width === preset.width &&
                                properties?.height === preset.height;
                              return (
                                <button
                                  key={preset.id}
                                  className={cn(
                                    "flex flex-col items-center gap-1 rounded-md py-1.5 text-[10px] transition-colors",
                                    isActive
                                      ? "bg-[#4f8ef7]/20 text-[#8ab4f8]"
                                      : "text-[#666] hover:bg-[#252525] hover:text-[#999]",
                                  )}
                                  onClick={() => applyFramePreset(preset)}
                                >
                                  <PresetIcon className="size-4" />
                                  <span>{preset.label}</span>
                                  <span className="text-[9px] text-[#555]">
                                    {preset.width}&times;{preset.height}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Alignment */}
                      <PropertySection defaultOpen title="Align">
                        <div className="flex items-center gap-1">
                          <AlignButton
                            icon={AlignStartVertical}
                            label="Align left"
                            onClick={() => alignObject("left")}
                          />
                          <AlignButton
                            icon={AlignCenterHorizontal}
                            label="Align center"
                            onClick={() => alignObject("center-h")}
                          />
                          <AlignButton
                            icon={AlignEndVertical}
                            label="Align right"
                            onClick={() => alignObject("right")}
                          />
                          <div className="mx-1 h-4 w-px bg-[#252525]" />
                          <AlignButton
                            icon={AlignStartHorizontal}
                            label="Align top"
                            onClick={() => alignObject("top")}
                          />
                          <AlignButton
                            icon={AlignCenterVertical}
                            label="Align middle"
                            onClick={() => alignObject("center-v")}
                          />
                          <AlignButton
                            icon={AlignEndHorizontal}
                            label="Align bottom"
                            onClick={() => alignObject("bottom")}
                          />
                        </div>
                      </PropertySection>

                      {/* Position & Size */}
                      <PropertySection defaultOpen title="Position & Size">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          <StudioPropertyField
                            labelBelow
                            label="X"
                            type="number"
                            value={properties.x}
                            onChange={handleChange("x")}
                          />
                          <StudioPropertyField
                            labelBelow
                            label="Y"
                            type="number"
                            value={properties.y}
                            onChange={handleChange("y")}
                          />
                          <StudioPropertyField
                            labelBelow
                            label="Width"
                            type="number"
                            value={properties.width}
                            onChange={handleChange("width")}
                          />
                          <StudioPropertyField
                            labelBelow
                            label="Height"
                            type="number"
                            value={properties.height}
                            onChange={handleChange("height")}
                          />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3">
                          <StudioPropertyField
                            labelBelow
                            label="Rotation"
                            suffix="°"
                            type="number"
                            value={properties.rotation}
                            onChange={handleChange("rotation")}
                          />
                          {isRect && (
                            <StudioPropertyField
                              labelBelow
                              label="Corner Radius"
                              suffix="px"
                              type="number"
                              value={properties.cornerRadius}
                              onChange={handleChange("cornerRadius")}
                            />
                          )}
                        </div>
                      </PropertySection>

                      {/* Appearance */}
                      <PropertySection defaultOpen title="Appearance">
                        <div className="grid grid-cols-2 gap-x-3">
                          <StudioPropertyField
                            labelBelow
                            label="Opacity"
                            suffix="%"
                            type="number"
                            value={Math.round(properties.opacity * 100)}
                            onChange={(v) => updateProperty("opacity", (v as number) / 100)}
                          />
                          {(isRect || isEllipse) && (
                            <StudioPropertyField
                              labelBelow
                              label="Blur"
                              suffix="px"
                              type="number"
                              value={0}
                              onChange={() => undefined}
                            />
                          )}
                        </div>
                      </PropertySection>

                      {/* Fill */}
                      <PropertySection
                        defaultOpen
                        action={
                          <div className="flex items-center gap-0.5">
                            <button
                              className="flex size-5 items-center justify-center rounded text-[#666] hover:text-[#999]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFillVisible(!fillVisible);
                              }}
                            >
                              {fillVisible ? (
                                <Eye className="size-3" />
                              ) : (
                                <EyeOff className="size-3" />
                              )}
                            </button>
                          </div>
                        }
                        title="Fill"
                      >
                        <div
                          className={cn(
                            "flex items-center gap-2",
                            !fillVisible && "pointer-events-none opacity-40",
                          )}
                        >
                          <input
                            className="size-7 flex-shrink-0 cursor-pointer rounded border border-[#444] bg-transparent p-0.5"
                            type="color"
                            value={properties.fill}
                            onChange={(e) => updateProperty("fill", e.target.value)}
                          />
                          <input
                            className="h-7 min-w-0 flex-1 rounded-md bg-[#252525] px-2 text-[11px] uppercase tabular-nums text-[#b0b0b0] outline-none focus:ring-1 focus:ring-[#4f8ef7]"
                            value={properties.fill}
                            onChange={(e) => updateProperty("fill", e.target.value)}
                          />
                          <span className="flex-shrink-0 text-[10px] text-[#555]">100%</span>
                        </div>
                      </PropertySection>

                      {/* Stroke */}
                      <PropertySection
                        action={
                          <div className="flex items-center gap-0.5">
                            <button
                              className="flex size-5 items-center justify-center rounded text-[#666] hover:text-[#999]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStrokeVisible(!strokeVisible);
                              }}
                            >
                              {strokeVisible ? (
                                <Eye className="size-3" />
                              ) : (
                                <EyeOff className="size-3" />
                              )}
                            </button>
                          </div>
                        }
                        title="Stroke"
                      >
                        <div
                          className={cn(
                            "space-y-2",
                            !strokeVisible && "pointer-events-none opacity-40",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              className="size-7 flex-shrink-0 cursor-pointer rounded border border-[#444] bg-transparent p-0.5"
                              type="color"
                              value={properties.stroke}
                              onChange={(e) => updateProperty("stroke", e.target.value)}
                            />
                            <input
                              className="h-7 min-w-0 flex-1 rounded-md bg-[#252525] px-2 text-[11px] uppercase tabular-nums text-[#b0b0b0] outline-none focus:ring-1 focus:ring-[#4f8ef7]"
                              value={properties.stroke}
                              onChange={(e) => updateProperty("stroke", e.target.value)}
                            />
                          </div>
                          <StudioPropertyField
                            label="W"
                            suffix="px"
                            type="number"
                            value={properties.strokeWidth}
                            onChange={handleChange("strokeWidth")}
                          />
                        </div>
                      </PropertySection>

                      {/* Typography — only for text objects */}
                      {isText && (
                        <PropertySection defaultOpen title="Typography">
                          <select
                            className="h-7 w-full rounded-md border border-[#444] bg-[#252525] px-2 text-[11px] text-[#e0e0e0] outline-none focus:ring-1 focus:ring-[#4f8ef7]"
                            value={properties.fontFamily}
                            onChange={(e) => updateProperty("fontFamily", e.target.value)}
                          >
                            {systemFonts.map((font) => (
                              <option key={font} value={font}>
                                {font}
                              </option>
                            ))}
                          </select>

                          <div className="grid grid-cols-2 gap-x-3">
                            <div className="flex flex-col gap-0.5">
                              <select
                                className="h-7 w-full rounded-md bg-[#252525] px-2 text-[11px] text-[#b0b0b0] outline-none focus:ring-1 focus:ring-[#4f8ef7]"
                                value={
                                  properties.fontWeight === "700" ? "bold" : properties.fontWeight
                                }
                                onChange={(e) => updateProperty("fontWeight", e.target.value)}
                              >
                                {FONT_WEIGHTS.map((w) => (
                                  <option key={w.value} value={w.value}>
                                    {w.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-center text-[9px] text-[#555]">Weight</span>
                            </div>
                            <StudioPropertyField
                              labelBelow
                              label="Size"
                              suffix="px"
                              type="number"
                              value={properties.fontSize}
                              onChange={handleChange("fontSize")}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-x-3">
                            <StudioPropertyField
                              labelBelow
                              label="Line Height"
                              type="number"
                              value={Math.round(properties.lineHeight * 100) / 100}
                              onChange={handleChange("lineHeight")}
                            />
                            <StudioPropertyField
                              labelBelow
                              label="Letter Spacing"
                              type="number"
                              value={properties.charSpacing}
                              onChange={handleChange("charSpacing")}
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <ToggleStyleButton
                              active={
                                properties.fontWeight === "bold" || properties.fontWeight === "700"
                              }
                              icon={Bold}
                              label="Bold"
                              onClick={() =>
                                updateProperty(
                                  "fontWeight",
                                  properties.fontWeight === "bold" ||
                                    properties.fontWeight === "700"
                                    ? "normal"
                                    : "bold",
                                )
                              }
                            />
                            <ToggleStyleButton
                              active={properties.fontStyle === "italic"}
                              icon={Italic}
                              label="Italic"
                              onClick={() =>
                                updateProperty(
                                  "fontStyle",
                                  properties.fontStyle === "italic" ? "normal" : "italic",
                                )
                              }
                            />
                            <div className="mx-1 h-4 w-px bg-[#252525]" />
                            <ToggleStyleButton
                              active={properties.textAlign === "left"}
                              icon={AlignLeft}
                              label="Align left"
                              onClick={() => updateProperty("textAlign", "left")}
                            />
                            <ToggleStyleButton
                              active={properties.textAlign === "center"}
                              icon={AlignCenter}
                              label="Align center"
                              onClick={() => updateProperty("textAlign", "center")}
                            />
                            <ToggleStyleButton
                              active={properties.textAlign === "right"}
                              icon={AlignRight}
                              label="Align right"
                              onClick={() => updateProperty("textAlign", "right")}
                            />
                          </div>
                        </PropertySection>
                      )}
                    </>
                  )}

                  {/* Layer Tab */}
                  {activeTab === "layer" && (
                    <div className="space-y-3 px-3 py-3">
                      <p className="text-[10px] font-medium text-[#808080]">Layer Order</p>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              aria-label="Bring to front"
                              className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#252525] text-[10px] text-[#888] transition-colors hover:bg-[#2e2e2e] hover:text-[#ccc]"
                              onClick={bringToFront}
                            >
                              <ArrowUpToLine className="size-3" />
                              <span>Bring to Front</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={4}>
                            Bring to front
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              aria-label="Send to back"
                              className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#252525] text-[10px] text-[#888] transition-colors hover:bg-[#2e2e2e] hover:text-[#ccc]"
                              onClick={sendToBack}
                            >
                              <ArrowDownToLine className="size-3" />
                              <span>Send to Back</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={4}>
                            Send to back
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}

                  {/* Export Tab */}
                  {activeTab === "export" && (
                    <div className="space-y-3 px-3 py-3">
                      <p className="text-[10px] font-medium text-[#808080]">Export Settings</p>
                      <div className="flex items-center gap-2">
                        <select
                          className="h-7 flex-1 rounded-md bg-[#252525] px-2 text-[11px] text-[#b0b0b0] outline-none focus:ring-1 focus:ring-[#4f8ef7]"
                          value={exportFormat}
                          onChange={(e) =>
                            setExportFormat(e.target.value as "png" | "svg" | "jpeg")
                          }
                        >
                          <option value="png">PNG</option>
                          <option value="svg">SVG</option>
                          <option value="jpeg">JPEG</option>
                        </select>
                        <select
                          className="h-7 w-16 rounded-md bg-[#252525] px-2 text-[11px] text-[#b0b0b0] outline-none focus:ring-1 focus:ring-[#4f8ef7]"
                          value={String(exportScale)}
                          onChange={(e) => setExportScale(Number(e.target.value))}
                        >
                          <option value="1">1x</option>
                          <option value="2">2x</option>
                          <option value="3">3x</option>
                        </select>
                      </div>
                      <button
                        className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-[#4f8ef7] text-[11px] font-medium text-white transition-colors hover:bg-[#3d7be5]"
                        onClick={handleExport}
                      >
                        <Download className="size-3" />
                        Export
                      </button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AlignButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          className="flex size-6 items-center justify-center rounded text-[#666] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
          onClick={onClick}
        >
          <Icon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ToggleStyleButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          className={cn(
            "flex size-6 items-center justify-center rounded transition-colors",
            active
              ? "bg-[#252525] text-[#e0e0e0]"
              : "text-[#666] hover:bg-[#252525] hover:text-[#ccc]",
          )}
          onClick={onClick}
        >
          <Icon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function PropertySection({
  title,
  children,
  defaultOpen = false,
  action,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex h-8 w-full items-center gap-1.5 border-t border-[#222] px-3 hover:bg-[#222]">
        <ChevronRight
          className={cn("size-3 text-[#666] transition-transform", open && "rotate-90")}
        />
        <span className="flex-1 text-left text-[11px] font-medium text-[#808080]">{title}</span>
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 px-3 pb-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
