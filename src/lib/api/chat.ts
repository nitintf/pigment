import { invoke } from "@tauri-apps/api/core";

export interface ChatSession {
  id: string;
  canvasId: string;
  model: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRow {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

export function createChatSession(
  canvasId: string,
  model: string,
  name: string,
): Promise<ChatSession> {
  return invoke<ChatSession>("create_chat_session", {
    canvasId,
    model,
    name,
  });
}

export function listChatSessions(canvasId: string): Promise<ChatSession[]> {
  return invoke<ChatSession[]>("list_chat_sessions", { canvasId });
}

export function deleteChatSession(id: string): Promise<void> {
  return invoke("delete_chat_session", { id });
}

export function saveChatMessage(
  sessionId: string,
  role: string,
  content: string,
): Promise<ChatMessageRow> {
  return invoke<ChatMessageRow>("save_chat_message", {
    sessionId,
    role,
    content,
  });
}

export function getChatMessages(sessionId: string): Promise<ChatMessageRow[]> {
  return invoke<ChatMessageRow[]>("get_chat_messages", { sessionId });
}

export function clearChatMessages(sessionId: string): Promise<void> {
  return invoke("clear_chat_messages", { sessionId });
}
