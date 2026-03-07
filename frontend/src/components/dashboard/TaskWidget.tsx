"use client";

import { CheckSquare, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
};

export function DashboardTaskWidget({ data, isLoading }: { data?: any; isLoading?: boolean }) {
  const router = useRouter();

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-electric-blue" />
          <h3 className="font-sora font-semibold" style={{ color: "var(--text-1)" }}>Tasks</h3>
          {data && (
            <span className="badge badge-blue">{data.total_active} active</span>
          )}
        </div>
        <button
          onClick={() => router.push("/tasks")}
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: "var(--text-2)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-4">
          {Object.entries(data.tasks_by_priority || {}).map(([priority, tasks]: [string, any]) => (
            <div key={priority}>
              <h4 className={clsx("text-xs font-semibold uppercase tracking-wider mb-2", PRIORITY_COLOR[priority])}>
                {priority}
              </h4>
              <div className="space-y-1.5">
                {(tasks as any[]).slice(0, 3).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ border: "1px solid var(--border-h)" }}
                    />
                    <span className="text-sm truncate flex-1" style={{ color: "var(--text-1)" }}>
                      {task.title}
                    </span>
                    {task.due_date && (
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--text-3)" }}>
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No active tasks" />
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CheckSquare size={32} className="mb-2 opacity-30" style={{ color: "var(--text-2)" }} />
      <p className="text-sm" style={{ color: "var(--text-3)" }}>{message}</p>
    </div>
  );
}
