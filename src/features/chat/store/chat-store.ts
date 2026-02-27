import { create } from "zustand";

import type { AgentRun, AiModel, ChatMessage, ChatState, TabChatSession } from "../types";

let messageCounter = 0;

function generateMessageId(): string {
  messageCounter += 1;
  return `msg-${String(messageCounter)}-${String(Date.now())}`;
}

const EMPTY_SESSION: TabChatSession = { messages: [], agents: [] };

function getSession(state: ChatState, tabId: string): TabChatSession {
  return state.tabSessions[tabId] ?? EMPTY_SESSION;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  tabSessions: {},
  selectedModel: "claude-sonnet",
  parallelAgents: 1,
  inputValue: "",

  actions: {
    toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

    setModel: (model: AiModel) => set({ selectedModel: model }),

    setParallelAgents: (count) => set({ parallelAgents: Math.max(1, Math.min(5, count)) }),

    setInputValue: (value) => set({ inputValue: value }),

    sendMessage: (content: string, tabId: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      const { parallelAgents, selectedModel } = get();

      // Create agent runs based on parallel agent count
      const newAgents: AgentRun[] = Array.from({ length: parallelAgents }, (_, i) => ({
        id: `agent-${String(i + 1)}-${String(Date.now())}`,
        label: parallelAgents > 1 ? `Agent ${String(i + 1)}` : "Agent",
        status: "thinking" as const,
        message: `Using ${selectedModel}...`,
      }));

      set((s) => {
        const session = getSession(s, tabId);
        return {
          tabSessions: {
            ...s.tabSessions,
            [tabId]: {
              messages: [...session.messages, userMessage],
              agents: newAgents,
            },
          },
          inputValue: "",
        };
      });

      // Simulate agent activity (placeholder — will be replaced with real API)
      for (const agent of newAgents) {
        setTimeout(
          () => {
            set((s) => {
              const session = getSession(s, tabId);
              return {
                tabSessions: {
                  ...s.tabSessions,
                  [tabId]: {
                    ...session,
                    agents: session.agents.map((a) =>
                      a.id === agent.id
                        ? { ...a, status: "working", message: "Analyzing design..." }
                        : a,
                    ),
                  },
                },
              };
            });
          },
          800 + Math.random() * 500,
        );

        setTimeout(
          () => {
            const assistantMessage: ChatMessage = {
              id: generateMessageId(),
              role: "assistant",
              content: `[${agent.label}] I've analyzed the canvas. This is a placeholder response — connect to a real AI backend to enable actual agent functionality.`,
              timestamp: Date.now(),
            };

            set((s) => {
              const session = getSession(s, tabId);
              return {
                tabSessions: {
                  ...s.tabSessions,
                  [tabId]: {
                    messages: [...session.messages, assistantMessage],
                    agents: session.agents.map((a) =>
                      a.id === agent.id ? { ...a, status: "done", message: "Complete" } : a,
                    ),
                  },
                },
              };
            });
          },
          2500 + Math.random() * 1000,
        );
      }
    },

    clearMessages: (tabId: string) =>
      set((s) => ({
        tabSessions: {
          ...s.tabSessions,
          [tabId]: EMPTY_SESSION,
        },
      })),
  },
}));

/** Hook to get the current tab's chat session */
export function useTabChatSession(tabId: string): TabChatSession {
  return useChatStore((s) => s.tabSessions[tabId] ?? EMPTY_SESSION);
}
