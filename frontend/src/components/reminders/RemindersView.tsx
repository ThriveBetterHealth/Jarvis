"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Bell, Plus, Check, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import toast from "react-hot-toast";

export function RemindersView() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [triggerAt, setTriggerAt] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const res = await api.get("/reminders?acknowledged=false");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/reminders", {
        title,
        trigger_type: "time_based",
        trigger_at: new Date(triggerAt).toISOString(),
        next_fire_at: new Date(triggerAt).toISOString(),
        channels: ["in_app", "email"],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      setTitle("");
      setTriggerAt("");
      setShowForm(false);
      toast.success("Reminder set");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/reminders/${id}/acknowledge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-sora text-2xl font-semibold">Reminders</h1>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Reminder
          </button>
        </div>

        {showForm && (
          <div className="card mb-4 animate-fade-in space-y-3">
            <input
              className="input-base w-full"
              placeholder="Reminder title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <input
              className="input-base w-full"
              type="datetime-local"
              value={triggerAt}
              onChange={(e) => setTriggerAt(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!title || !triggerAt}
                className="btn-primary text-sm"
              >
                Set Reminder
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : (data?.reminders || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell size={48} className="text-gray-600 mb-3" />
            <p className="text-gray-400">No upcoming reminders.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.reminders.map((r: any) => (
              <div key={r.id} className="card flex items-center gap-4 group">
                <div className="w-9 h-9 rounded-lg bg-cyan-accent/20 flex items-center justify-center flex-shrink-0">
                  <Bell size={16} className="text-cyan-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.title}</p>
                  {r.next_fire_at && (
                    <p className="text-xs text-gray-500">
                      {format(new Date(r.next_fire_at), "EEEE, MMM d 'at' h:mm a")}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => acknowledgeMutation.mutate(r.id)}
                    className="p-1.5 text-gray-500 hover:text-green-400 transition-colors"
                    title="Acknowledge"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(r.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
