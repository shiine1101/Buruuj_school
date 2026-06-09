"use client";

import { AppShell } from "@/components/app-shell";
import { AdminTrackingDashboard } from "@/components/live-tracking/admin-dashboard";
import { DriverTrackingPanel } from "@/components/live-tracking/driver-panel";
import { useAppStore } from "@/lib/store";

export default function LiveTrackingPage() {
  const { role } = useAppStore();

  return (
    <AppShell>
      {role === "ADMIN" ? (
        <AdminTrackingDashboard />
      ) : role === "DRIVER" ? (
        <DriverTrackingPanel />
      ) : (
        <div className="rounded-md border bg-white p-4 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900">
          Live Tracking is available only to admins and drivers.
        </div>
      )}
    </AppShell>
  );
}
