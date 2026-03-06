"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, CheckCircle2, Circle, Trash2, Filter } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

const PRIORITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["backlog", "todo", "in_progress", "blocked", "done", "cancelled"];

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-400/20 text-red-400",
  high: "bg-orange-400/20 text-orange-400",
  medium: "bg-yellow-400/20 text-yellow-400",
  low: "bg-gray-400/20 text-gray-400",
};

export function TasksView() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", filterStatus],
    queryFn: async () => {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const res = await api.get(`/tasks${params}`);
      return res.data;
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
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-sora text-2xl font-semibold">Tasks</h1>
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
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              New Task
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="card mb-4 animate-fade-in">
            <input
              className="input-base w-full mb-3"
              placeholder="Task title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") createMutation.mutate(newTitle);
                if (e.key === "Escape") setShowCreateForm(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate(newTitle)}
                disabled={!newTitle.trim()}
                className="btn-primary text-sm"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary text-sm"
              >
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
            <CheckCircle2 size={48} className="text-gray-600 mb-3" />
            <p className="text-gray-400">No tasks yet. Create your first task above.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {(data?.tasks || []).map((task: any) => (
              <div
                key={task.id}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group",
                  task.status === "done" && "opacity-50"
                )}
              >
                <button
                  onClick={() => task.status !== "done" && completeMutation.mutate(task.id)}
                  className="text-gray-500 hover:text-green-400 transition-colors flex-shrink-0"
                >
                  {task.status === "done" ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={clsx("text-sm", task.status === "done" && "line-through text-gray-500")}>
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <span className={clsx("badge text-xs", PRIORITY_BADGE[task.priority])}>
                  {task.priority}
                </span>

                <button
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
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
