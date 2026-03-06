"use client";

import { BookOpen } from "lucide-react";

export function NotebookEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <BookOpen size={48} className="text-gray-600 mb-4" />
      <h2 className="font-sora text-lg font-semibold mb-2">Select a page</h2>
      <p className="text-sm text-gray-500">
        Choose a page from the sidebar, or create a new one in a workspace.
      </p>
    </div>
  );
}
