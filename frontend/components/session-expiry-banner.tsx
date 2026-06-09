"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { clearAccessToken, getBackendAuthSession, getSessionExpiryMs, refreshAuthSession } from "@/lib/api-client";

export function SessionExpiryBanner() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const session = getBackendAuthSession();
      if (!session) return;

      const expiryMs = getSessionExpiryMs();
      if (!expiryMs) return;

      const remaining = expiryMs - Date.now();
      if (remaining <= 0) {
        clearAccessToken();
        window.location.href = "/";
        return;
      }

      if (remaining <= 2 * 60 * 1000) {
        setVisible(true);
        setMessage(`Your session expires in ${Math.max(1, Math.ceil(remaining / 60000))} minute(s).`);
      } else {
        setVisible(false);
        setMessage("");
      }
    }

    checkSession();
    const timer = window.setInterval(checkSession, 15000);
    return () => window.clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
      <div className="flex items-center gap-2 font-medium">
        <Clock3 className="h-4 w-4" />
        {message}
      </div>
      <button
        type="button"
        onClick={() => refreshAuthSession().then(() => setVisible(false)).catch(() => window.location.href = "/")}
        className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700"
      >
        Extend Session
      </button>
    </div>
  );
}
