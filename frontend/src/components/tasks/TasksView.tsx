"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

const PRIORITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["backlog", "todo", "in_progress", "blocked", "done", "cancelled"];

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-400/20 text-red-400",
  high:     "bg-orange-400/20 text-orange-400",
  medium:   "bg-yellow-400/20 text-yellow-400",
  low:      "bg-blue-400/20 text-blue-400",
};

export function TasksView() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", filterStatus],
    queryFn: async () => {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      return (await api.get(`/tasks${params}`)).data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => api.post("/tasks", { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setNewTitle("");
      setShowCreateForm(false);
      toast.success("Task created");
    },
    onError: () => toast.error("Failed to create task"),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-sora text-xl md:text-2xl font-semibold" style={{ color: "var(--text-1)" }}>
            Tasks
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-base text-sm py-1.5"
            >
              <option value="">All status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              New Task
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="card mb-4">
            <input
              className="input-base w-full mb-3"
              placeholder="Task title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) createMutation.mutate(newTitle);
                if (e.key === "Escape") setShowCreateForm(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { if (newTitle.trim()) createMutation.mutate(newTitle); }}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="btn-primary text-sm"
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </button>
              <button onClick={() => setShowCreateForm(false)} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Task list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : (data?.tasks || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 size={48} className="mb-3" style={{ color: "var(--text-2)" }} />
            <p style={{ color: "var(--text-2)" }}>No tasks yet. Create your first task above.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {(data?.tasks || []).map((task: any) => (
              <div
                key={task.id}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group",
                  task.status === "done" && "opacity-50"
                )}
                style={{ background: "var(--surface)", borderColor: "var(--border-c)" }}
              >
                <button
                  onClick={() => task.status !== "done" && completeMutation.mutate(task.id)}
                  className="flex-shrink-0 transition-colors"
                  style={{ color: task.status === "done" ? "#4ade80" : "var(--text-2)" }}
                >
                  {task.status === "done" ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={clsx("text-sm", task.status === "done" && "line-through")}
                    style={{ color: task.status === "done" ? "var(--text-2)" : "var(--text-1)" }}
                  >
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <span className={clsx("badge text-xs", PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.low)}>
                  {task.priority}
                </span>

                <button
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
