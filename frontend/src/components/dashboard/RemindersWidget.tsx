"use client";

import { Bell, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export function DashboardRemindersWidget({ data, isLoading }: { data?: any; isLoading?: boolean }) {
  const router = useRouter();

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-cyan-accent" />
          <h3 className="font-sora font-semibold text-sm" style={{ color: "var(--text-1)" }}>
            Upcoming
          </h3>
        </div>
        <button
          onClick={() => router.push("/reminders")}
          className="flex items-center gap-1 transition-colors"
          style={{ color: "var(--text-2)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
        >
          <ArrowRight size={12} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="skeleton h-8 rounded" />)}
        </div>
      ) : (data?.reminders || []).length > 0 ? (
        <div className="space-y-1">
          {data.reminders.map((r: any) => (
            <div key={r.id} className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-accent flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-1)" }}>{r.title}</p>
                {r.next_fire_at && (
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>
                    {format(new Date(r.next_fire_at), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-center py-4" style={{ color: "var(--text-3)" }}>
          No upcoming reminders
        </p>
      )}
    </div>
  );
}
