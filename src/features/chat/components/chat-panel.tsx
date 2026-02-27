import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useChatStore, useTabChatSession } from "../store/chat-store";
import { AI_MODELS } from "../types";

import type { AgentStatus } from "../types";

import { useStudioStore } from "@/features/studio/store/studio-store";
import { useTabStore } from "@/features/studio/store/tab-store";
import { cn } from "@/lib/utils";

const STATUS_ICON: Record<AgentStatus, React.ReactNode> = {
  idle: <Bot className="size-3 text-[#666]" />,
  thinking: <Loader2 className="size-3 animate-spin text-[#8ab4f8]" />,
  working: <Loader2 className="size-3 animate-spin text-[#f7c948]" />,
  done: <Check className="size-3 text-[#4ade80]" />,
  error: <CircleAlert className="size-3 text-[#f87171]" />,
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  thinking: "Thinking...",
  working: "Working...",
  done: "Done",
  error: "Error",
};

export function ChatPanel() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const isOpen = useChatStore((s) => s.isOpen);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const parallelAgents = useChatStore((s) => s.parallelAgents);
  const inputValue = useChatStore((s) => s.inputValue);
  const { toggleChat, setModel, setParallelAgents, setInputValue, sendMessage, clearMessages } =
    useChatStore((s) => s.actions);
  const rightPanelOpen = useStudioStore((s) => s.rightPanelOpen);

  const { messages, agents } = useTabChatSession(activeTabId);

  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showAgentsPicker, setShowAgentsPicker] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const agentsBtnRef = useRef<HTMLButtonElement>(null);
  const agentsPickerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${String(Math.min(el.scrollHeight, 120))}px`;
  }, [inputValue]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showModelPicker && !showAgentsPicker) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showModelPicker &&
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        modelBtnRef.current &&
        !modelBtnRef.current.contains(target)
      ) {
        setShowModelPicker(false);
      }
      if (
        showAgentsPicker &&
        agentsPickerRef.current &&
        !agentsPickerRef.current.contains(target) &&
        agentsBtnRef.current &&
        !agentsBtnRef.current.contains(target)
      ) {
        setShowAgentsPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelPicker, showAgentsPicker]);

  const toggleModelPicker = useCallback(() => {
    setShowModelPicker((prev) => !prev);
  }, []);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue, activeTabId, attachments);
    setAttachments([]);
  }, [inputValue, activeTabId, attachments, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel) ?? AI_MODELS[0];

  // Offset from right edge — shift left when right panel is open
  const rightOffset = rightPanelOpen ? 260 + 12 : 12;

  // Check if any agents are actively running
  const hasActiveAgents = agents.some((a) => a.status === "thinking" || a.status === "working");

  return (
    <motion.div
      animate={{ right: rightOffset }}
      className="absolute bottom-3 z-20"
      transition={{ type: "tween", duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* ── Collapsed mini-bar ── */
          <motion.button
            key="collapsed"
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-xl bg-[#191919] px-3 py-2 shadow-lg shadow-black/30 transition-colors hover:bg-[#1f1f1f]"
            exit={{ opacity: 0, scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={toggleChat}
          >
            <Sparkles className="size-3.5 text-[#8ab4f8]" />
            <span className="text-[11px] font-medium text-[#888]">Design with AI</span>

            {/* Agent status indicators on collapsed bar */}
            {agents.length > 0 && (
              <>
                <div className="h-3 w-px bg-[#333]" />
                {hasActiveAgents ? (
                  <div className="flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin text-[#8ab4f8]" />
                    <span className="text-[10px] text-[#8ab4f8]">Working...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Check className="size-3 text-[#4ade80]" />
                    <span className="text-[10px] text-[#4ade80]">Done</span>
                  </div>
                )}
              </>
            )}

            <ChevronUp className="size-3 text-[#555]" />
          </motion.button>
        ) : (
          /* ── Expanded chat panel ── */
          <motion.div
            key="expanded"
            animate={{ opacity: 1, y: 0 }}
            className="flex w-[380px] flex-col overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#191919] shadow-2xl shadow-black/50"
            exit={{ opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            style={{ maxHeight: "min(480px, calc(100vh - 120px))" }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-[#222] px-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3 text-[#8ab4f8]" />
                <span className="text-[11px] font-medium text-[#999]">AI Chat</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  className="flex size-5 items-center justify-center rounded text-[#666] transition-colors hover:bg-[#252525] hover:text-[#999]"
                  title="New Chat"
                  onClick={() => clearMessages(activeTabId)}
                >
                  <MessageSquarePlus className="size-3" />
                </button>
                <button
                  className="flex size-5 items-center justify-center rounded text-[#666] transition-colors hover:bg-[#252525] hover:text-[#999]"
                  title="Minimize"
                  onClick={toggleChat}
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
            </div>

            {/* Agent status pills */}
            {agents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-b border-[#222] px-3 py-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px]",
                      agent.status === "done"
                        ? "bg-[#4ade80]/10 text-[#4ade80]"
                        : agent.status === "error"
                          ? "bg-[#f87171]/10 text-[#f87171]"
                          : agent.status === "thinking" || agent.status === "working"
                            ? "bg-[#8ab4f8]/10 text-[#8ab4f8]"
                            : "bg-[#333] text-[#888]",
                    )}
                  >
                    {STATUS_ICON[agent.status]}
                    <span className="font-medium">{agent.label}</span>
                    <span className="text-[9px] opacity-70">{STATUS_LABEL[agent.status]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                  <Sparkles className="size-5 text-[#333]" />
                  <p className="text-[11px] text-[#555]">
                    Ask anything about your design or let AI help you build.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 px-3 py-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2.5",
                        msg.role === "user" ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-[#4f8ef7]/20">
                          <Bot className="size-2.5 text-[#8ab4f8]" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed",
                          msg.role === "user" ? "bg-[#4f8ef7] text-white" : "bg-[#222] text-[#ccc]",
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="flex flex-col gap-2 border-t border-[#222] p-3">
              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((file, i) => (
                    <div
                      key={`${file.name}-${String(i)}`}
                      className="flex items-center gap-1 rounded-md bg-[#252525] px-2 py-1 text-[10px] text-[#999]"
                    >
                      <Paperclip className="size-2.5" />
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button
                        className="ml-0.5 text-[#666] hover:text-[#999]"
                        onClick={() => removeAttachment(i)}
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  className="w-full resize-none rounded-xl bg-[#222] px-3 py-2.5 pr-9 text-[12px] leading-relaxed text-[#e0e0e0] outline-none placeholder:text-[#555]"
                  placeholder="Design with AI..."
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={cn(
                    "absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md transition-colors",
                    inputValue.trim()
                      ? "bg-[#4f8ef7] text-white hover:bg-[#3d7be5]"
                      : "text-[#555]",
                  )}
                  disabled={!inputValue.trim()}
                  onClick={handleSend}
                >
                  <Send className="size-3" />
                </button>
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center gap-1">
                {/* Model selector */}
                <div className="relative">
                  <button
                    ref={modelBtnRef}
                    className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] text-[#888] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
                    onClick={toggleModelPicker}
                  >
                    <Sparkles className="size-3" />
                    <span>{currentModel.label}</span>
                    <ChevronDown className="size-2.5" />
                  </button>
                  <AnimatePresence>
                    {showModelPicker && (
                      <motion.div
                        ref={pickerRef}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-0 bottom-full z-50 mb-1 min-w-[200px] rounded-lg border border-[#2a2a2a] bg-[#191919] py-1 shadow-xl shadow-black/40"
                        exit={{ opacity: 0, y: 4 }}
                        initial={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.12 }}
                      >
                        {AI_MODELS.map((model) => (
                          <button
                            key={model.id}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#252525]",
                              selectedModel === model.id ? "text-[#8ab4f8]" : "text-[#999]",
                            )}
                            onClick={() => {
                              setModel(model.id);
                              setShowModelPicker(false);
                            }}
                          >
                            <Sparkles className="size-3 flex-shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-medium">{model.label}</span>
                              <span className="text-[9px] text-[#666]">{model.description}</span>
                            </div>
                            {selectedModel === model.id && (
                              <Check className="ml-auto size-3 text-[#4f8ef7]" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-3 w-px bg-[#333]" />

                {/* Parallel agents dropdown */}
                <div className="relative">
                  <button
                    ref={agentsBtnRef}
                    className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] text-[#888] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
                    onClick={() => setShowAgentsPicker((p) => !p)}
                  >
                    <Users className="size-3" />
                    <span>
                      {parallelAgents} {parallelAgents === 1 ? "Agent" : "Agents"}
                    </span>
                    <ChevronDown className="size-2.5" />
                  </button>
                  <AnimatePresence>
                    {showAgentsPicker && (
                      <motion.div
                        ref={agentsPickerRef}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-0 bottom-full z-50 mb-1 w-[180px] rounded-lg border border-[#2a2a2a] bg-[#191919] py-1 shadow-xl shadow-black/40"
                        exit={{ opacity: 0, y: 4 }}
                        initial={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.12 }}
                      >
                        {[1, 2, 3, 4, 5].map((count) => (
                          <button
                            key={count}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#252525]",
                              parallelAgents === count ? "text-[#8ab4f8]" : "text-[#999]",
                            )}
                            onClick={() => {
                              setParallelAgents(count);
                              setShowAgentsPicker(false);
                            }}
                          >
                            <Users className="size-3 flex-shrink-0" />
                            <span className="text-[11px] font-medium">
                              {count} {count === 1 ? "Agent" : "Parallel Agents"}
                            </span>
                            {parallelAgents === count && (
                              <Check className="ml-auto size-3 text-[#4f8ef7]" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-3 w-px bg-[#333]" />

                {/* Attach file */}
                <button
                  className="flex h-6 items-center gap-1 rounded-md px-2 text-[10px] text-[#888] transition-colors hover:bg-[#252525] hover:text-[#ccc]"
                  onClick={handleFileSelect}
                >
                  <Paperclip className="size-3" />
                  <span>Attach</span>
                </button>
                <input
                  ref={fileInputRef}
                  multiple
                  className="hidden"
                  type="file"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
