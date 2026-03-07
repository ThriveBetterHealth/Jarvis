"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  FileText,
  FolderPlus,
  FilePlus,
} from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

interface NotebookSidebarProps {
  selectedPageId: string | null;
  onSelectPage: (pageId: string, workspaceId: string) => void;
}

export function NotebookSidebar({ selectedPageId, onSelectPage }: NotebookSidebarProps) {
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const qc = useQueryClient();

  const { data: workspacesData, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => (await api.get("/notebook/workspaces")).data,
  });

  const createWsMutation = useMutation({
    mutationFn: async (name: string) =>
      (await api.post("/notebook/workspaces", { name })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setNewWsName("");
      setShowNewWs(false);
      toast.success("Notebook created");
      if (data?.id) {
        setExpandedWs((prev) => new Set([...prev, data.id]));
      }
    },
    onError: () => toast.error("Failed to create notebook"),
  });

  const handleCreateWs = () => {
    const name = newWsName.trim() || "New Notebook";
    createWsMutation.mutate(name);
  };

  const toggleWs = (id: string) =>
    setExpandedWs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const workspaces = workspacesData?.workspaces || [];

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--surface)" }}
    >
      {/* Header */}
      <div
        className="px-3 pt-4 pb-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border-c)" }}
      >
        <h2
          className="font-sora text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-3)" }}
        >
          Notebooks
        </h2>

        {/* New Notebook button / inline form */}
        {!showNewWs ? (
          <button
            onClick={() => setShowNewWs(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
            style={{
              background: "rgba(26,115,232,0.12)",
              color: "#1A73E8",
              border: "1px solid rgba(26,115,232,0.2)",
            }}
          >
            <FolderPlus size={14} />
            New Notebook
          </button>
        ) : (
          <div
            className="rounded-xl p-3"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-c)" }}
          >
            <input
              className="input-base w-full text-xs py-1.5 mb-2"
              placeholder="Notebook name…"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateWs();
                if (e.key === "Escape") { setShowNewWs(false); setNewWsName(""); }
              }}
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreateWs}
                disabled={createWsMutation.isPending}
                className="btn-primary flex-1 text-xs py-1.5"
              >
                {createWsMutation.isPending ? "…" : "Create"}
              </button>
              <button
                onClick={() => { setShowNewWs(false); setNewWsName(""); }}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-3 space-y-2 mt-1">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-8 rounded-xl" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Folder size={28} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-2)" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
              No notebooks yet.<br />Click <strong>New Notebook</strong> above.
            </p>
          </div>
        ) : (
          workspaces.map((ws: any) => (
            <WorkspaceItem
              key={ws.id}
              workspace={ws}
              expanded={expandedWs.has(ws.id)}
              onToggle={() => toggleWs(ws.id)}
              selectedPageId={selectedPageId}
              onSelectPage={onSelectPage}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WorkspaceItem({
  workspace,
  expanded,
  onToggle,
  selectedPageId,
  onSelectPage,
}: {
  workspace: any;
  expanded: boolean;
  onToggle: () => void;
  selectedPageId: string | null;
  onSelectPage: (pageId: string, workspaceId: string) => void;
}) {
  const qc = useQueryClient();
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");

  const { data: pagesData } = useQuery({
    queryKey: ["pages", workspace.id],
    queryFn: async () => (await api.get(`/notebook/pages?workspace_id=${workspace.id}`)).data,
    enabled: expanded,
  });

  const createPageMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await api.post("/notebook/pages", {
        workspace_id: workspace.id,
        title: title || "Untitled",
        blocks: [],
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pages", workspace.id] });
      setNewPageTitle("");
      setShowNewPage(false);
      if (data?.id) onSelectPage(data.id, workspace.id);
      if (!expanded) onToggle();
    },
    onError: () => toast.error("Failed to create page"),
  });

  const handleCreatePage = () => {
    createPageMutation.mutate(newPageTitle.trim() || "Untitled");
  };

  const pages = pagesData?.pages || [];

  return (
    <div className="mb-0.5">
      {/* Workspace row */}
      <div
        className="flex items-center gap-1.5 px-2 py-2 mx-2 rounded-xl cursor-pointer group transition-colors duration-100"
        onClick={onToggle}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-2)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        <span style={{ color: "var(--text-3)" }} className="flex-shrink-0">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        {expanded ? (
          <FolderOpen size={15} style={{ color: "#1A73E8" }} className="flex-shrink-0" />
        ) : (
          <Folder size={15} style={{ color: "#1A73E8" }} className="flex-shrink-0" />
        )}
        <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--text-1)" }}>
          {workspace.name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!expanded) onToggle();
            setShowNewPage(true);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
          style={{ color: "var(--text-2)" }}
          title="New page"
        >
          <FilePlus size={13} />
        </button>
      </div>

      {/* Pages */}
      {expanded && (
        <div className="ml-5 mr-2 mb-1">
          {pages.map((page: any) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id, workspace.id)}
              className={clsx(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg w-full text-left text-xs transition-all duration-100"
              )}
              style={{
                background: selectedPageId === page.id ? "rgba(26,115,232,0.14)" : "transparent",
                color: selectedPageId === page.id ? "#1A73E8" : "var(--text-2)",
                boxShadow:
                  selectedPageId === page.id ? "inset 0 0 0 1px rgba(26,115,232,0.22)" : "none",
              }}
              onMouseEnter={(e) => {
                if (selectedPageId !== page.id)
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
              }}
              onMouseLeave={(e) => {
                if (selectedPageId !== page.id)
                  (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <FileText size={12} className="flex-shrink-0 opacity-60" />
              <span className="truncate">{page.title || "Untitled"}</span>
            </button>
          ))}

          {/* Inline new-page form */}
          {showNewPage ? (
            <div className="mt-1.5 px-1">
              <input
                className="input-base w-full text-xs py-1.5 mb-1.5"
                placeholder="Page title…"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePage();
                  if (e.key === "Escape") { setShowNewPage(false); setNewPageTitle(""); }
                }}
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  onClick={handleCreatePage}
                  disabled={createPageMutation.isPending}
                  className="btn-primary flex-1 text-xs py-1"
                >
                  {createPageMutation.isPending ? "…" : "Create"}
                </button>
                <button
                  onClick={() => { setShowNewPage(false); setNewPageTitle(""); }}
                  className="btn-secondary text-xs py-1 px-2"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewPage(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 w-full text-xs rounded-lg transition-colors duration-100 mt-0.5"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
                (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <Plus size={11} />
              New page
            </button>
          )}
        </div>
      )}
    </div>
  );
}
