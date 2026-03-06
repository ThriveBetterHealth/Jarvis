"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardTaskWidget } from "@/components/dashboard/TaskWidget";
import { DashboardNotesWidget } from "@/components/dashboard/NotesWidget";
import { DashboardRemindersWidget } from "@/components/dashboard/RemindersWidget";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: briefing, isLoading } = useQuery({
    queryKey: ["dashboard", "briefing"],
    queryFn: async () => {
      const res = await api.get("/dashboard/briefing");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm font-mono">
              {format(new Date(), "EEEE, MMMM d yyyy")}
            </p>
            <h1 className="font-sora text-2xl font-semibold mt-1">Good morning</h1>
          </div>

          {/* AI Insights Panel */}
          <AIInsightsPanel insights={briefing?.ai_insights} isLoading={isLoading} />

          {/* Widgets grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            <div className="lg:col-span-2">
              <DashboardTaskWidget data={briefing?.tasks} isLoading={isLoading} />
            </div>
            <div className="space-y-4">
              <DashboardRemindersWidget data={briefing?.upcoming_reminders} isLoading={isLoading} />
              <DashboardNotesWidget data={briefing?.recent_notes} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
