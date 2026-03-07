"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotebookSidebar } from "@/components/notebook/NotebookSidebar";
import { PageEditor } from "@/components/notebook/PageEditor";
import { BookOpen } from "lucide-react";

export default function NotebookPage() {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  const handleSelectPage = (pageId: string, workspaceId: string) => {
    setSelectedPageId(pageId);
    setSelectedWorkspaceId(workspaceId);
  };

  return (
    <AppLayout
      leftPanelOverride={
        <NotebookSidebar
          selectedPageId={selectedPageId}
          onSelectPage={handleSelectPage}
        />
      }
    >
      {selectedPageId ? (
        <PageEditor pageId={selectedPageId} key={selectedPageId} />
      ) : (
        <div
          className="flex flex-col items-center justify-center h-full text-center p-8"
          style={{ background: "var(--bg)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--surface-2)" }}
          >
            <BookOpen size={28} className="text-electric-blue" />
          </div>
          <h2 className="font-sora text-lg font-semibold mb-2" style={{ color: "var(--text-1)" }}>
            Select a page
          </h2>
          <p className="text-sm max-w-xs" style={{ color: "var(--text-2)" }}>
            Choose a page from the sidebar, or click <strong>+</strong> next to a workspace to create one.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
