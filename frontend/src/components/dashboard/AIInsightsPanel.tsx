"use client";

import { Sparkles } from "lucide-react";

interface AIInsightsPanelProps {
  insights?: string;
  isLoading?: boolean;
}

export function AIInsightsPanel({ insights, isLoading }: AIInsightsPanelProps) {
  return (
    <div className="card ai-content">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-cyan-accent" />
        <span className="text-sm font-semibold text-cyan-accent">AI Briefing</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-4/6" />
        </div>
      ) : (
        <p className="text-sm text-gray-300 leading-relaxed">
          {insights || "No briefing available yet. Complete some tasks and add notes to get started."}
        </p>
      )}
    </div>
  );
}
