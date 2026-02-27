import { create } from "zustand";

import type { CanvasMeta } from "@/lib/api/canvas";

import * as canvasApi from "@/lib/api/canvas";
import { setPreference } from "@/lib/api/preferences";

export interface Tab {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function toTab(meta: CanvasMeta): Tab {
  return {
    id: meta.id,
    name: meta.name,
    sortOrder: meta.sortOrder,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
}

interface TabState {
  tabs: Tab[];
  activeTabId: string;
  initialized: boolean;
  actions: {
    initialize: (lastActiveId?: string) => Promise<void>;
    addTab: () => Promise<void>;
    closeTab: (id: string) => Promise<void>;
    duplicateTab: (id: string) => Promise<void>;
    setActiveTab: (id: string) => void;
    renameTab: (id: string, name: string) => Promise<void>;
  };
}

let tabNameCounter = 1;

export const useTabStore = create<TabState>()((set, get) => ({
  tabs: [],
  activeTabId: "",
  initialized: false,
  actions: {
    initialize: async (lastActiveId?: string) => {
      if (get().initialized) return;
      const canvases = await canvasApi.listCanvases();

      if (canvases.length === 0) {
        const canvas = await canvasApi.createCanvas("Untitled 1");
        tabNameCounter = 2;
        set({ tabs: [toTab(canvas)], activeTabId: canvas.id, initialized: true });
        return;
      }

      const tabs = canvases.map(toTab);

      // Find highest "Untitled N" number for counter continuity
      for (const tab of tabs) {
        const match = /^Untitled (\d+)$/.exec(tab.name);
        if (match) {
          tabNameCounter = Math.max(tabNameCounter, Number(match[1]) + 1);
        }
      }

      const activeId =
        lastActiveId && tabs.some((t) => t.id === lastActiveId) ? lastActiveId : tabs[0].id;

      set({ tabs, activeTabId: activeId, initialized: true });
    },

    addTab: async () => {
      const name = `Untitled ${String(tabNameCounter)}`;
      tabNameCounter += 1;
      const canvas = await canvasApi.createCanvas(name);
      const tab = toTab(canvas);
      set((s) => ({
        tabs: [...s.tabs, tab],
        activeTabId: tab.id,
      }));
      void setPreference("lastActiveCanvasId", tab.id);
    },

    closeTab: async (id: string) => {
      const { tabs, activeTabId } = get();
      await canvasApi.deleteCanvas(id);

      const remaining = tabs.filter((t) => t.id !== id);

      if (remaining.length === 0) {
        const name = `Untitled ${String(tabNameCounter)}`;
        tabNameCounter += 1;
        const canvas = await canvasApi.createCanvas(name);
        const newTab = toTab(canvas);
        set({ tabs: [newTab], activeTabId: newTab.id });
        void setPreference("lastActiveCanvasId", newTab.id);
        return;
      }

      const needsNewActive = activeTabId === id;
      const newActiveId = needsNewActive ? remaining[remaining.length - 1].id : activeTabId;

      set({ tabs: remaining, activeTabId: newActiveId });
      void setPreference("lastActiveCanvasId", newActiveId);
    },

    duplicateTab: async (id: string) => {
      const { tabs } = get();
      const source = tabs.find((t) => t.id === id);
      if (!source) return;

      const newName = `${source.name} copy`;
      const canvas = await canvasApi.createCanvas(newName);
      const sourceState = await canvasApi.getCanvasState(id);
      if (sourceState) {
        await canvasApi.saveCanvasState(
          canvas.id,
          sourceState.canvasJson,
          sourceState.zoom,
          sourceState.viewportTransform,
        );
      }

      const tab = toTab(canvas);
      set((s) => ({
        tabs: [...s.tabs, tab],
        activeTabId: tab.id,
      }));
      void setPreference("lastActiveCanvasId", tab.id);
    },

    setActiveTab: (id: string) => {
      set({ activeTabId: id });
      void setPreference("lastActiveCanvasId", id);
    },

    renameTab: async (id: string, name: string) => {
      await canvasApi.renameCanvas(id, name);
      set((s) => ({
        tabs: s.tabs.map((t) => (t.id === id ? { ...t, name } : t)),
      }));
    },
  },
}));
