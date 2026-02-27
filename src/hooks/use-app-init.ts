import { useEffect, useState } from "react";

import { useChatStore } from "@/features/chat/store/chat-store";
import { useStudioStore } from "@/features/studio/store/studio-store";
import { useTabStore } from "@/features/studio/store/tab-store";
import { getPreference } from "@/lib/api/preferences";

export function useAppInit(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      // Restore UI preferences
      const leftSidebarOpen = await getPreference("leftSidebarOpen", false);
      const rightPanelOpen = await getPreference("rightPanelOpen", false);

      const studioActions = useStudioStore.getState().actions;
      if (leftSidebarOpen) studioActions.toggleLeftSidebar();
      if (rightPanelOpen) studioActions.toggleRightPanel();

      // Initialize chat preferences (model, agent count)
      await useChatStore.getState().actions.initializePreferences();

      // Load canvases from SQLite
      const lastActiveId = await getPreference<string>("lastActiveCanvasId", "");
      await useTabStore.getState().actions.initialize(lastActiveId || undefined);

      setReady(true);
    }

    void init();
  }, []);

  return ready;
}
