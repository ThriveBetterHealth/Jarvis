"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Mic, Paperclip, StopCircle, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  isStreaming?: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Streaming assistant placeholder
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/assistant/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jarvis-token") || ""}`,
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            message: text,
            stream: true,
          }),
        }
      );

      if (!response.ok) throw new Error("Request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
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
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (error) {
      toast.error("Failed to send message");
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
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <WelcomeScreen onPrompt={(p) => setInput(p)} />
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Jarvis anything..."
            className="flex-1 bg-transparent text-white placeholder:text-gray-500 text-sm resize-none outline-none max-h-32 min-h-[24px]"
            rows={1}
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="btn-ghost p-1.5 text-gray-500 hover:text-gray-300">
              <Paperclip size={16} />
            </button>
            <button className="btn-ghost p-1.5 text-gray-500 hover:text-gray-300">
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
        <p className="text-xs text-gray-600 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={clsx("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
          isUser
            ? "bg-electric-blue/20 text-electric-blue"
            : "bg-cyan-accent/20 text-cyan-accent"
        )}
      >
        {isUser ? "Y" : <Sparkles size={14} />}
      </div>

      {/* Content */}
      <div
        className={clsx(
          "max-w-2xl rounded-xl px-4 py-3 text-sm",
          isUser
            ? "bg-electric-blue/20 text-white ml-auto"
            : "bg-white/5 text-gray-100"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || (message.isStreaming ? "▋" : "")}
            </ReactMarkdown>
          </div>
        )}
        {message.model_used && (
          <p className="text-xs text-gray-500 mt-1">{message.model_used}</p>
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
      <h2 className="font-sora text-xl font-semibold mb-2">How can I help?</h2>
      <p className="text-gray-400 text-sm mb-8">Ask me anything, or pick a suggestion below.</p>
      <div className="grid grid-cols-2 gap-3 max-w-lg">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="card text-left text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
