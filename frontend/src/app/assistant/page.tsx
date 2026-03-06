"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { ChatInterface } from "@/components/assistant/ChatInterface";

export default function AssistantPage() {
  return (
    <AppLayout rightPanel={<AssistantSidebar />}>
      <ChatInterface />
    </AppLayout>
  );
}

function AssistantSidebar() {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-sora text-sm font-semibold text-gray-400 uppercase tracking-wider">Context</h3>
      <p className="text-xs text-gray-500">Related notes and memory will appear here as you chat.</p>
    </div>
  );
}
