export type AgentStatus = "idle" | "thinking" | "working" | "done" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface AgentRun {
  id: string;
  label: string;
  status: AgentStatus;
  message?: string;
}

export type AiModel = "claude-sonnet" | "claude-opus" | "claude-haiku";

/** Per-tab chat session data */
export interface TabChatSession {
  messages: ChatMessage[];
  agents: AgentRun[];
}

export interface ChatState {
  isOpen: boolean;
  /** Chat sessions keyed by tab ID */
  tabSessions: Record<string, TabChatSession>;
  selectedModel: AiModel;
  parallelAgents: number;
  inputValue: string;
  actions: ChatActions;
}

export interface ChatActions {
  toggleChat: () => void;
  setModel: (model: AiModel) => void;
  setParallelAgents: (count: number) => void;
  setInputValue: (value: string) => void;
  sendMessage: (content: string, tabId: string, attachments?: File[]) => void;
  clearMessages: (tabId: string) => void;
}

export const AI_MODELS: { id: AiModel; label: string; description: string }[] = [
  { id: "claude-sonnet", label: "Claude Sonnet", description: "Fast & capable" },
  { id: "claude-opus", label: "Claude Opus", description: "Most powerful" },
  { id: "claude-haiku", label: "Claude Haiku", description: "Fastest" },
];
