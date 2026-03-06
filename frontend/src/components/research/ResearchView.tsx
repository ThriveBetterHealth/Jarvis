"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FlaskConical, Plus, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const STATUS_ICON: Record<string, React.ReactNode> = {
  queued: <Clock size={14} className="text-gray-400" />,
  running: <Loader2 size={14} className="text-blue-400 animate-spin" />,
  completed: <CheckCircle size={14} className="text-green-400" />,
  failed: <XCircle size={14} className="text-red-400" />,
  cancelled: <XCircle size={14} className="text-gray-400" />,
};

export function ResearchView() {
  const [brief, setBrief] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["research"],
    queryFn: async () => {
      const res = await api.get("/research");
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5s
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post("/research", { brief, save_to_notebook: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research"] });
      setBrief("");
      toast.success("Research job queued");
    },
  });

  return (
    <div className="h-full flex">
      {/* Job list */}
      <div className="w-80 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-sora font-semibold mb-3">Research Agent</h2>
          <textarea
            className="input-base w-full text-sm resize-none"
            rows={3}
            placeholder="Enter a research brief..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <button
            onClick={() => submitMutation.mutate()}
            disabled={!brief.trim() || submitMutation.isPending}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
          >
            {submitMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Submit Research
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {(data?.jobs || []).map((job: any) => (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={clsx(
                "w-full text-left px-3 py-3 rounded-lg mb-1 hover:bg-white/5 transition-colors",
                selectedJob?.id === job.id && "bg-white/5"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {STATUS_ICON[job.status]}
                <span className="text-xs text-gray-400 capitalize">{job.status}</span>
                <span className="text-xs text-gray-600 ml-auto">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-200 line-clamp-2">{job.brief}</p>
              {job.status === "running" && (
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-electric-blue rounded-full transition-all"
                    style={{ width: `${job.progress_pct}%` }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Report view */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedJob ? (
          <div>
            <h2 className="font-sora text-lg font-semibold mb-1">{selectedJob.brief}</h2>
            <div className="flex items-center gap-3 mb-6">
              {STATUS_ICON[selectedJob.status]}
              <span className="text-sm text-gray-400 capitalize">{selectedJob.status}</span>
              {selectedJob.status === "running" && (
                <span className="text-sm text-gray-400">{selectedJob.progress_pct}%</span>
              )}
            </div>

            {selectedJob.report_markdown ? (
              <div className="prose prose-invert prose-sm max-w-none ai-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedJob.report_markdown}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                {selectedJob.status === "running" ? (
                  <>
                    <Loader2 size={32} className="text-electric-blue animate-spin mb-3" />
                    <p className="text-gray-400">Researching... {selectedJob.progress_pct}% complete</p>
                  </>
                ) : (
                  <p className="text-gray-500">No report available yet.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FlaskConical size={48} className="text-gray-600 mb-4" />
            <h2 className="font-sora text-lg font-semibold mb-2">Research Agent</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              Submit a research brief and Jarvis will autonomously search the web, synthesise findings, and deliver a structured report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
