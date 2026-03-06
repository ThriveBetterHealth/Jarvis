"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { NotebookSidebar } from "@/components/notebook/NotebookSidebar";
import { NotebookEmpty } from "@/components/notebook/NotebookEmpty";

export default function NotebookPage() {
  return (
    <AppLayout leftPanelOverride={<NotebookSidebar />}>
      <NotebookEmpty />
    </AppLayout>
  );
}
