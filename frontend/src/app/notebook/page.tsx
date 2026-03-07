"use client";

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotebookSidebar } from "@/components/notebook/NotebookSidebar";
import { PageEditor } from "@/components/notebook/PageEditor";
import { BookOpen, FolderPlus } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function NotebookPage() {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [newWsName, setNewWsName] = useState("");
  const [showWsInput, setShowWsInput] = useState(false);
  const qc = useQueryClient();

  const handleSelectPage = (pageId: string, _workspaceId: string) => {
    setSelectedPageId(pageId);
  };

  const createWsMutation = useMutation({
    mutationFn: async (name: string) =>
      (await api.post("/notebook/workspaces", { name })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setNewWsName("");
      setShowWsInput(false);
      toast.success("Notebook created!");
    },
    onError: () => toast.error("Failed to create notebook"),
  });

  const handleCreateWs = () => {
    const name = newWsName.trim() || "My Notebook";
    createWsMutation.mutate(name);
  };

  return (
    <AppLayout
      leftPanelOverride={
        <NotebookSidebar
          selectedPageId={selectedPageId}
          onSelectPage={handleSelectPage}
        />
      }
    >
      {selectedPageId ? (
        <PageEditor pageId={selectedPageId} key={selectedPageId} />
      ) : (
        <div
          className="flex flex-col items-center justify-center h-full p-8"
          style={{ background: "var(--bg)" }}
        >
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(26,115,232,0.15) 0%, rgba(0,188,212,0.12) 100%)",
              border: "1px solid rgba(26,115,232,0.2)",
            }}
          >
            <BookOpen size={36} style={{ color: "#1A73E8" }} />
          </div>

          <h2
            className="font-sora text-2xl font-bold mb-2 text-center"
            style={{ color: "var(--text-1)" }}
          >
            Your Notebook
          </h2>
          <p
            className="text-sm text-center max-w-sm mb-10"
            style={{ color: "var(--text-2)" }}
          >
            Organise your thoughts, notes, and ideas. Create a notebook (workspace) to get started, then add pages inside it.
          </p>

          {/* Quick-create area */}
          <div className="w-full max-w-sm space-y-3">
            {/* Create Notebook */}
            {showWsInput ? (
              <div
                className="rounded-2xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border-c)" }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-2)" }}>
                  NOTEBOOK NAME
                </p>
                <input
                  className="input-base w-full mb-3"
                  placeholder="e.g. Work, Personal, Ideas…"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateWs()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateWs}
                    disabled={createWsMutation.isPending}
                    className="btn-primary flex-1 text-sm py-2"
                  >
                    {createWsMutation.isPending ? "Creating…" : "Create Notebook"}
                  </button>
                  <button
                    onClick={() => { setShowWsInput(false); setNewWsName(""); }}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowWsInput(true)}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all duration-150 group"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-c)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-h)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-c)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(26,115,232,0.15)" }}
                >
                  <FolderPlus size={20} style={{ color: "#1A73E8" }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>
                    New Notebook
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-2)" }}>
                    Create a workspace to organise pages
                  </p>
                </div>
              </button>
            )}

            {/* Tip */}
            <p className="text-xs text-center pt-2" style={{ color: "var(--text-3)" }}>
              Or pick an existing notebook from the sidebar on the left
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
