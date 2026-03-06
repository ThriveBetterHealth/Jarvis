"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, ChevronRight, ChevronDown, Folder, FileText, Cpu } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

export function NotebookSidebar() {
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data: workspacesData } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get("/notebook/workspaces");
      return res.data;
    },
  });

  const createWsMutation = useMutation({
    mutationFn: () => api.post("/notebook/workspaces", { name: "New Workspace" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace created");
    },
  });

  const toggleWs = (id: string) => {
    setExpandedWs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full border-r border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="font-sora text-sm font-semibold">Notebook</h2>
        <button
          onClick={() => createWsMutation.mutate()}
          className="text-gray-400 hover:text-white transition-colors"
          title="New workspace"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto py-2">
        {(workspacesData?.workspaces || []).map((ws: any) => (
          <WorkspaceItem
            key={ws.id}
            workspace={ws}
            expanded={expandedWs.has(ws.id)}
            onToggle={() => toggleWs(ws.id)}
          />
        ))}
        {(!workspacesData?.workspaces || workspacesData.workspaces.length === 0) && (
          <p className="text-xs text-gray-500 px-4 py-2">
            No workspaces yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}

function WorkspaceItem({ workspace, expanded, onToggle }: any) {
  const qc = useQueryClient();

  const { data: pagesData } = useQuery({
    queryKey: ["pages", workspace.id],
    queryFn: async () => {
      const res = await api.get(`/notebook/pages?workspace_id=${workspace.id}`);
      return res.data;
    },
    enabled: expanded,
  });

  const createPageMutation = useMutation({
    mutationFn: () =>
      api.post("/notebook/pages", {
        workspace_id: workspace.id,
        title: "Untitled",
        blocks: [],
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pages", workspace.id] }),
  });

  return (
    <div>
      <div className="flex items-center gap-1 px-2 py-1 group hover:bg-white/5 rounded-lg mx-2">
        <button onClick={onToggle} className="p-0.5 text-gray-500 hover:text-white">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <Folder size={14} className="text-electric-blue flex-shrink-0" />
        <span className="text-sm text-gray-300 flex-1 truncate">{workspace.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            createPageMutation.mutate();
            onToggle();
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-all"
        >
          <Plus size={12} />
        </button>
      </div>

      {expanded && (
        <div className="ml-6">
          {(pagesData?.pages || []).map((page: any) => (
            <div
              key={page.id}
              className="flex items-center gap-2 px-2 py-1 rounded-lg mx-1 hover:bg-white/5 cursor-pointer"
            >
              <FileText size={13} className="text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-400 truncate">{page.title || "Untitled"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
