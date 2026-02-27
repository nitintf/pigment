import { create } from "zustand";

export interface TabCanvasState {
  canvasJson: string;
  zoom: number;
  viewportTransform: number[];
}

export interface Tab {
  id: string;
  name: string;
  edited: boolean;
  canvasState?: TabCanvasState;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string;
  actions: {
    addTab: () => void;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    renameTab: (id: string, name: string) => void;
    markEdited: (id: string) => void;
    saveTabCanvasState: (id: string, state: TabCanvasState) => void;
  };
}

let tabCounter = 1;

function createTab(): Tab {
  const id = `tab-${String(tabCounter)}-${String(Date.now())}`;
  const name = `Untitled ${String(tabCounter)}`;
  tabCounter += 1;
  return { id, name, edited: false };
}

const initialTab = createTab();

export const useTabStore = create<TabState>()((set) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,
  actions: {
    addTab: () => {
      const tab = createTab();
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
    },
    closeTab: (id: string) => {
      set((state) => {
        const remaining = state.tabs.filter((t) => t.id !== id);
        if (remaining.length === 0) {
          // Always keep at least one tab
          const newTab = createTab();
          return { tabs: [newTab], activeTabId: newTab.id };
        }
        const needsNewActive = state.activeTabId === id;
        return {
          tabs: remaining,
          activeTabId: needsNewActive ? remaining[remaining.length - 1].id : state.activeTabId,
        };
      });
    },
    setActiveTab: (id: string) => {
      set({ activeTabId: id });
    },
    renameTab: (id: string, name: string) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, name } : t)),
      }));
    },
    markEdited: (id: string) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, edited: true } : t)),
      }));
    },
    saveTabCanvasState: (id: string, state: TabCanvasState) => {
      set((s) => ({
        tabs: s.tabs.map((t) => (t.id === id ? { ...t, canvasState: state } : t)),
      }));
    },
  },
}));
