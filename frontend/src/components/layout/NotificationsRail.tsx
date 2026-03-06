"use client";

import { useEffect, useRef } from "react";
import { X, Bell, CheckCircle, AlertCircle, Info, Clock } from "lucide-react";
import { clsx } from "clsx";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "reminder";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// Sample notifications — in production these come from the API
const SAMPLE: Notification[] = [
  { id: "1", type: "reminder",  title: "Reminder due",       body: "Team standup in 15 minutes",          time: "Just now",   read: false },
  { id: "2", type: "success",   title: "Research complete",  body: "Your research report is ready to view", time: "2 min ago", read: false },
  { id: "3", type: "info",      title: "New AI model",       body: "Claude Opus 4 is now available",       time: "1 hr ago",  read: true  },
  { id: "4", type: "warning",   title: "Task overdue",       body: "\"Deploy to prod\" is past its due date", time: "3 hr ago", read: true },
];

const ICON_MAP = {
  info:     <Info     size={14} className="text-electric-blue" />,
  success:  <CheckCircle size={14} className="text-green-400" />,
  warning:  <AlertCircle size={14} className="text-orange-400" />,
  reminder: <Clock    size={14} className="text-cyan-accent" />,
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificationsRail({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const unread = SAMPLE.filter((n) => !n.read).length;

  return (
    <>
      {/* Overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ background: "rgba(0,0,0,0.3)" }}
      />

      {/* Rail — slides in from the right */}
      <div
        ref={ref}
        className={clsx(
          "fixed top-0 right-0 h-full w-80 z-50 flex flex-col shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border-c)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border-c)" }}>
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-electric-blue" />
            <span className="font-sora font-semibold text-sm" style={{ color: "var(--text-1)" }}>Notifications</span>
            {unread > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-electric-blue text-white font-medium">{unread}</span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end px-4 py-2 border-b" style={{ borderColor: "var(--border-c)" }}>
          <button className="text-xs text-electric-blue hover:underline">Mark all read</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {SAMPLE.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
              <Bell size={32} className="text-gray-600" />
              <p className="text-sm" style={{ color: "var(--text-2)" }}>No notifications yet</p>
            </div>
          ) : (
            SAMPLE.map((n) => (
              <div
                key={n.id}
                className={clsx(
                  "flex gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors",
                  !n.read && "border-l-2 border-electric-blue"
                )}
              >
                <div className="mt-0.5 flex-shrink-0">{ICON_MAP[n.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight" style={{ color: "var(--text-1)" }}>{n.title}</p>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-2)" }}>{n.time}</span>
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-2)" }}>{n.body}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border-c)" }}>
          <button className="w-full text-xs text-center" style={{ color: "var(--text-2)" }}>
            View all notifications
          </button>
        </div>
      </div>
    </>
  );
}
