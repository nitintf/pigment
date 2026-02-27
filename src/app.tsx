import { useMemo, useState } from "react";

import { ChatPanel } from "@/features/chat";
import { useChatStore } from "@/features/chat/store/chat-store";
import {
  Studio,
  StudioCanvas,
  StudioDeleteButton,
  StudioLayersPanel,
  StudioPropertiesPanel,
  StudioShapeMenu,
  StudioToolbar,
  StudioToolbarButton,
  StudioTopBar,
  StudioZoomControls,
} from "@/features/studio";
import { StudioCommandMenu } from "@/features/studio/components/studio-command-menu";
import { StudioSettingsDialog } from "@/features/studio/components/studio-settings-dialog";
import { useStudioStore } from "@/features/studio/store/studio-store";
import { useTabStore } from "@/features/studio/store/tab-store";
import { useHotkeys } from "@/hooks/use-hotkeys";

function App() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleLeftSidebar = useStudioStore((s) => s.actions.toggleLeftSidebar);
  const toggleRightPanel = useStudioStore((s) => s.actions.toggleRightPanel);
  const toggleChat = useChatStore((s) => s.actions.toggleChat);

  const hotkeys = useMemo(
    () => [
      { key: "k", meta: true, handler: () => setCommandOpen(true) },
      { key: "\\", meta: true, handler: toggleLeftSidebar },
      { key: ".", meta: true, handler: toggleRightPanel },
      { key: "j", meta: true, handler: toggleChat },
      { key: ",", meta: true, handler: () => setSettingsOpen(true) },
    ],
    [toggleLeftSidebar, toggleRightPanel, toggleChat],
  );

  useHotkeys(hotkeys);

  return (
    <Studio>
      <StudioTopBar onOpenSettings={() => setSettingsOpen(true)} />

      <div className="relative flex-1 overflow-hidden">
        <StudioCanvas key={activeTabId} />
        <StudioToolbar>
          <StudioToolbarButton tool="select" />
          <StudioShapeMenu shapeMenu />
          <StudioToolbarButton tool="text" />
          <StudioToolbarButton tool="frame" />
          <StudioToolbarButton tool="hand" />
          <div className="my-0.5 h-px w-full bg-[#3a3a3a]" />
          <StudioDeleteButton />
        </StudioToolbar>

        <StudioLayersPanel />

        <StudioPropertiesPanel />

        <StudioZoomControls />

        <ChatPanel />
      </div>

      <StudioCommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <StudioSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Studio>
  );
}

export default App;
