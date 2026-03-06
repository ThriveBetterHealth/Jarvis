"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { TasksView } from "@/components/tasks/TasksView";

export default function TasksPage() {
  return (
    <AppLayout>
      <TasksView />
    </AppLayout>
  );
}
