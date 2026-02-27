import { create } from "zustand";

import type { AgentRun, AiModel, ChatMessage, ChatState, TabChatSession } from "../types";

import * as chatApi from "@/lib/api/chat";
import { getPreference, setPreference } from "@/lib/api/preferences";

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

    setModel: (model: AiModel) => {
      set({ selectedModel: model });
      void setPreference("selectedModel", model);
    },

    setParallelAgents: (count) => {
      const clamped = Math.max(1, Math.min(5, count));
      set({ parallelAgents: clamped });
      void setPreference("parallelAgents", clamped);
    },

    setInputValue: (value) => set({ inputValue: value }),

    initializePreferences: async () => {
      const model = await getPreference<AiModel>("selectedModel", "claude-sonnet");
      const agents = await getPreference<number>("parallelAgents", 1);
      set({ selectedModel: model, parallelAgents: agents });
    },

    loadSessionForTab: async (tabId: string) => {
      const sessions = await chatApi.listChatSessions(tabId);
      if (sessions.length === 0) return;

      // Load messages from the most recent session
      const latestSession = sessions[sessions.length - 1];
      const messageRows = await chatApi.getChatMessages(latestSession.id);

      const messages: ChatMessage[] = messageRows.map((row) => ({
        id: row.id,
        role: row.role as ChatMessage["role"],
        content: row.content,
        timestamp: new Date(row.createdAt).getTime(),
      }));

      set((s) => ({
        tabSessions: {
          ...s.tabSessions,
          [tabId]: {
            messages,
            agents: [],
            sessionId: latestSession.id,
          },
        },
      }));
    },

    sendMessage: async (content: string, tabId: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      const { parallelAgents, selectedModel } = get();
      const session = getSession(get(), tabId);

      // Ensure a chat session exists in SQLite
      let sessionId = (session as TabChatSession & { sessionId?: string }).sessionId;
      if (!sessionId) {
        const dbSession = await chatApi.createChatSession(tabId, selectedModel, "Chat");
        sessionId = dbSession.id;
      }

      // Persist user message
      void chatApi.saveChatMessage(sessionId, "user", content.trim());

      const newAgents: AgentRun[] = Array.from({ length: parallelAgents }, (_, i) => ({
        id: `agent-${String(i + 1)}-${String(Date.now())}`,
        label: parallelAgents > 1 ? `Agent ${String(i + 1)}` : "Agent",
        status: "thinking" as const,
        message: `Using ${selectedModel}...`,
      }));

      set((s) => ({
        tabSessions: {
          ...s.tabSessions,
          [tabId]: {
            messages: [...session.messages, userMessage],
            agents: newAgents,
            sessionId,
          },
        },
        inputValue: "",
      }));

      // Simulate agent activity (placeholder — will be replaced with real API)
      for (const agent of newAgents) {
        setTimeout(
          () => {
            set((s) => {
              const sess = getSession(s, tabId);
              return {
                tabSessions: {
                  ...s.tabSessions,
                  [tabId]: {
                    ...sess,
                    agents: sess.agents.map((a) =>
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

            // Persist assistant message
            const sess = getSession(get(), tabId);
            const sid = (sess as TabChatSession & { sessionId?: string }).sessionId;
            if (sid) {
              void chatApi.saveChatMessage(sid, "assistant", assistantMessage.content);
            }

            set((s) => {
              const currentSess = getSession(s, tabId);
              return {
                tabSessions: {
                  ...s.tabSessions,
                  [tabId]: {
                    ...currentSess,
                    messages: [...currentSess.messages, assistantMessage],
                    agents: currentSess.agents.map((a) =>
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

    clearMessages: async (tabId: string) => {
      const session = getSession(get(), tabId);
      const sessionId = (session as TabChatSession & { sessionId?: string }).sessionId;
      if (sessionId) {
        await chatApi.clearChatMessages(sessionId);
      }
      set((s) => ({
        tabSessions: {
          ...s.tabSessions,
          [tabId]: EMPTY_SESSION,
        },
      }));
    },
  },
}));

export function useTabChatSession(tabId: string): TabChatSession {
  return useChatStore((s) => s.tabSessions[tabId] ?? EMPTY_SESSION);
}
