"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface PageEditorProps {
  pageId: string;
}

export function PageEditor({ pageId }: PageEditorProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: page, isLoading } = useQuery({
    queryKey: ["page", pageId],
    queryFn: async () => (await api.get(`/notebook/pages/${pageId}`)).data,
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title || "");
      // Extract text content from blocks
      const text = (page.blocks || [])
        .map((b: any) => (typeof b === "string" ? b : b?.content || ""))
        .join("\n");
      setContent(text);
      setIsDirty(false);
    }
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/notebook/pages/${pageId}`, {
        title,
        blocks: content
          .split("\n")
          .map((line) => ({ type: "paragraph", content: line })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["page", pageId] });
      qc.invalidateQueries({ queryKey: ["pages"] });
      setIsDirty(false);
    },
    onError: () => toast.error("Failed to save"),
  });

  // Auto-save after 1.5s of inactivity
  const handleChange = (newTitle: string, newContent: string) => {
    setTitle(newTitle);
    setContent(newContent);
    setIsDirty(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveMutation.mutate(), 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "var(--bg)" }}>
        <Loader2 size={24} className="animate-spin text-electric-blue" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border-c)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs" style={{ color: "var(--text-2)" }}>
              Unsaved changes
            </span>
          )}
          {saveMutation.isPending && (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-2)" }}>
              <Loader2 size={12} className="animate-spin" /> Saving…
            </span>
          )}
          {!isDirty && !saveMutation.isPending && page && (
            <span className="text-xs" style={{ color: "var(--text-2)" }}>
              All changes saved
            </span>
          )}
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 disabled:opacity-40"
        >
          <Save size={13} />
          Save
        </button>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Title */}
          <input
            className="w-full bg-transparent font-sora font-bold text-3xl outline-none mb-6 placeholder:opacity-30"
            style={{ color: "var(--text-1)" }}
            placeholder="Untitled"
            value={title}
            onChange={(e) => handleChange(e.target.value, content)}
          />

          {/* Body */}
          <textarea
            className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed placeholder:opacity-30"
            style={{ color: "var(--text-1)", minHeight: "60vh" }}
            placeholder="Start writing… (Markdown supported)"
            value={content}
            onChange={(e) => handleChange(title, e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
        </div>
      </div>
    </div>
  );
}
