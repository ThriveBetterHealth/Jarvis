"use client";

import { BookOpen, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export function DashboardNotesWidget({ data, isLoading }: { data?: any; isLoading?: boolean }) {
  const router = useRouter();

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-electric-blue" />
          <h3 className="font-sora font-semibold text-sm" style={{ color: "var(--text-1)" }}>
            Recent Notes
          </h3>
        </div>
        <button
          onClick={() => router.push("/notebook")}
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
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-8 rounded" />)}
        </div>
      ) : (data?.pages || []).length > 0 ? (
        <div className="space-y-1">
          {data.pages.map((page: any) => (
            <button
              key={page.id}
              onClick={() => router.push(`/notebook?page=${page.id}`)}
              className="w-full text-left px-2 py-1.5 rounded-lg transition-colors"
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-2)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <p className="text-sm truncate" style={{ color: "var(--text-1)" }}>{page.title}</p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-center py-4" style={{ color: "var(--text-3)" }}>
          No recent notes
        </p>
      )}
    </div>
  );
}
