"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { RemindersView } from "@/components/reminders/RemindersView";

export default function RemindersPage() {
  return (
    <AppLayout>
      <RemindersView />
    </AppLayout>
  );
}
