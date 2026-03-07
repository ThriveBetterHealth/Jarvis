"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

interface NotebookSidebarProps {
  selectedPageId: string | null;
  onSelectPage: (pageId: string, workspaceId: string) => void;
}

export function NotebookSidebar({ selectedPageId, onSelectPage }: NotebookSidebarProps) {
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: workspacesData } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => (await api.get("/notebook/workspaces")).data,
  });

  const createWsMutation = useMutation({
    mutationFn: async () => {
      const name = prompt("Workspace name:") || "New Workspace";
      return api.post("/notebook/workspaces", { name });
    },
    onSuccess: (_, __, ctx) => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace created");
    },
    onError: () => toast.error("Failed to create workspace"),
  });

  const toggleWs = (id: string) =>
    setExpandedWs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const workspaces = workspacesData?.workspaces || [];

  return (
    <div
      className="flex flex-col h-full border-r"
      style={{ background: "var(--surface)", borderColor: "var(--border-c)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border-c)" }}
      >
        <h2 className="font-sora text-sm font-semibold" style={{ color: "var(--text-1)" }}>
          Notebook
        </h2>
        <button
          onClick={() => createWsMutation.mutate()}
          className="hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-2)" }}
          title="New workspace"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto py-2">
        {workspaces.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs mb-3" style={{ color: "var(--text-2)" }}>
              No workspaces yet
            </p>
            <button
              onClick={() => createWsMutation.mutate()}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 mx-auto"
            >
              <Plus size={12} />
              Create workspace
            </button>
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

  const { data: pagesData } = useQuery({
    queryKey: ["pages", workspace.id],
    queryFn: async () => (await api.get(`/notebook/pages?workspace_id=${workspace.id}`)).data,
    enabled: expanded,
  });

  const createPageMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/notebook/pages", {
        workspace_id: workspace.id,
        title: "Untitled",
        blocks: [],
      });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pages", workspace.id] });
      // Auto-open the new page
      if (data?.id) onSelectPage(data.id, workspace.id);
      if (!expanded) onToggle();
    },
    onError: () => toast.error("Failed to create page"),
  });

  return (
    <div>
      {/* Workspace row */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 group rounded-lg mx-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onToggle}
      >
        <span style={{ color: "var(--text-2)" }}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <Folder size={14} className="text-electric-blue flex-shrink-0" />
        <span className="text-sm flex-1 truncate" style={{ color: "var(--text-1)" }}>
          {workspace.name}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); createPageMutation.mutate(); }}
          className="opacity-0 group-hover:opacity-100 transition-all hover:opacity-70 p-0.5"
          style={{ color: "var(--text-2)" }}
          title="New page"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Pages */}
      {expanded && (
        <div className="ml-5 mb-1">
          {(pagesData?.pages || []).length === 0 ? (
            <button
              onClick={() => createPageMutation.mutate()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs w-full rounded hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-2)" }}
            >
              <Plus size={11} />
              New page
            </button>
          ) : (
            (pagesData?.pages || []).map((page: any) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id, workspace.id)}
                className={clsx(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg mx-1 w-full text-left transition-all",
                  selectedPageId === page.id
                    ? "bg-electric-blue/15 text-electric-blue"
                    : "hover:opacity-80"
                )}
                style={{ color: selectedPageId === page.id ? undefined : "var(--text-2)" }}
              >
                <FileText size={13} className="flex-shrink-0" />
                <span className="text-xs truncate">{page.title || "Untitled"}</span>
              </button>
            ))
          )}
          {(pagesData?.pages || []).length > 0 && (
            <button
              onClick={() => createPageMutation.mutate()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs w-full rounded hover:opacity-70 transition-opacity mt-0.5"
              style={{ color: "var(--text-2)" }}
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
