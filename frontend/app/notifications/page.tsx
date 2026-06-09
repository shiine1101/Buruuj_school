"use client";

import { useEffect, useState } from "react";
import {
  Bell, CheckCheck, Trash2, RefreshCw, PlusCircle,
  AlertCircle, Info, CreditCard, UserCheck
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";

type BackendNotification = {
  id: string;
  title: string;
  body: string;
  channel: string;
  event: string;
  sentTo: string | null;
  createdAt: string;
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  payment:    <CreditCard className="h-4 w-4 text-emerald-600" />,
  attendance: <UserCheck className="h-4 w-4 text-blue-600" />,
  alert:      <AlertCircle className="h-4 w-4 text-rose-600" />,
  default:    <Info className="h-4 w-4 text-violet-600" />,
};

const EVENT_BG: Record<string, string> = {
  payment:    "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900",
  attendance: "bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900",
  alert:      "bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900",
  default:    "bg-violet-50 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900",
};

function getEventKey(event: string) {
  const e = event.toLowerCase();
  if (e.includes("payment")) return "payment";
  if (e.includes("attend")) return "attendance";
  if (e.includes("alert") || e.includes("breakdown") || e.includes("violation")) return "alert";
  return "default";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { role } = useAppStore();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [error, setError] = useState("");

  async function fetchNotifications() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<BackendNotification[]>("/notifications?limit=100");
      setNotifications(data);
    } catch (e) {
      // Fallback to store notifications if backend not available
      setError("Could not load notifications from server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchNotifications(); }, []);

  const filtered = filter === "all"
    ? notifications
    : notifications.filter((n) => getEventKey(n.event) === filter);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Remove locally even if backend fails
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearAll() {
    if (!confirm("Clear all notifications?")) return;
    setClearingAll(true);
    try {
      await apiFetch("/notifications/all", { method: "DELETE" });
      setNotifications([]);
    } catch {
      setNotifications([]);
    } finally {
      setClearingAll(false);
    }
  }

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "payment", label: "Payments" },
    { key: "attendance", label: "Attendance" },
    { key: "alert", label: "Alerts" },
    { key: "default", label: "General" },
  ];

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Notifications</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {notifications.length} total · {filtered.length} shown
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchNotifications}
                  disabled={loading}
                  className="h-8 gap-1.5 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                {role === "ADMIN" && notifications.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={clearingAll}
                    className="h-8 gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {clearingAll ? "Clearing..." : "Clear All"}
                  </Button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    filter === f.key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {f.label}
                  {f.key === "all" && notifications.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">
                      {notifications.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardHeader>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white py-20 text-center dark:border-slate-800 dark:bg-slate-900">
            <CheckCheck className="h-12 w-12 text-emerald-400 mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">All clear!</p>
            <p className="text-sm text-slate-400 mt-1">No notifications in this category.</p>
          </div>
        )}

        {/* Notification list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((item) => {
              const eKey = getEventKey(item.event);
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${EVENT_BG[eKey]}`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-900">
                    {EVENT_ICONS[eKey] ?? EVENT_ICONS.default}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </p>
                      <span className="shrink-0 rounded-full border bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-900/50">
                        {item.channel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{item.body}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{timeAgo(item.createdAt)}</span>
                      {item.sentTo && <span>→ {item.sentTo}</span>}
                    </div>
                  </div>
                  {role === "ADMIN" && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-black/10 hover:text-rose-600 transition-colors"
                      title="Dismiss"
                    >
                      {deletingId === item.id
                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
