"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Mic, Paperclip, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import toast from "react-hot-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  isStreaming?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      const response = await fetch(`${API_BASE}/api/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || ""}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: text,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.delta) {
              fullContent += parsed.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: fullContent, isStreaming: !parsed.done }
                    : m
                )
              );
            }
            if (parsed.conversation_id) setConversationId(parsed.conversation_id);
          } catch {}
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && <WelcomeScreen onPrompt={(p) => { setInput(p); textareaRef.current?.focus(); }} />}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t p-4" style={{ borderColor: "var(--border-c)" }}>
        <div
          className="flex items-end gap-2 rounded-xl p-3 border"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-c)" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Jarvis anything…"
            className="flex-1 bg-transparent text-sm resize-none outline-none max-h-32 min-h-[24px]"
            style={{ color: "var(--text-1)" }}
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="btn-ghost p-1.5">
              <Paperclip size={16} />
            </button>
            <button className="btn-ghost p-1.5">
              <Mic size={16} />
            </button>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="btn-primary p-1.5 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "var(--text-2)" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={clsx("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
          isUser ? "bg-electric-blue/20 text-electric-blue" : "bg-cyan-accent/20 text-cyan-accent"
        )}
      >
        {isUser ? "U" : <Sparkles size={14} />}
      </div>
      <div
        className={clsx("max-w-2xl rounded-xl px-4 py-3 text-sm", isUser ? "ml-auto" : "")}
        style={{
          background: isUser ? "rgba(26,115,232,0.15)" : "var(--surface-2)",
          color: "var(--text-1)",
          border: `1px solid var(--border-c)`,
        }}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none" style={{ color: "var(--text-1)" }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || (message.isStreaming ? "▋" : "")}
            </ReactMarkdown>
          </div>
        )}
        {message.model_used && (
          <p className="text-xs mt-1" style={{ color: "var(--text-2)" }}>
            {message.model_used}
          </p>
        )}
      </div>
    </div>
  );
}

function WelcomeScreen({ onPrompt }: { onPrompt: (p: string) => void }) {
  const prompts = [
    "Summarise my tasks for today",
    "Help me plan a project",
    "Research recent AI developments",
    "Analyse a document",
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-2xl bg-electric-blue/20 flex items-center justify-center mb-4">
        <Sparkles size={28} className="text-cyan-accent" />
      </div>
      <h2 className="font-sora text-xl font-semibold mb-2" style={{ color: "var(--text-1)" }}>
        How can I help?
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--text-2)" }}>
        Ask me anything, or pick a suggestion below.
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-lg">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="card text-left text-sm hover:opacity-80 transition-all"
            style={{ color: "var(--text-1)" }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
