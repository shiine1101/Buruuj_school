"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarDays, Globe2, LogOut, Menu, Moon, Search, ShieldCheck, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BrandLogo } from "@/components/brand-logo";
import { SessionExpiryBanner } from "@/components/session-expiry-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { navigation } from "@/lib/mock-data";
import { canAccess, NAV_TRANSLATIONS, type Role } from "@/lib/permissions";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { clearAccessToken, getBackendAuthSession } from "@/lib/api-client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, language, setLanguage } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    function syncSession() {
      const session = getBackendAuthSession();
      if (!session) {
        clearAccessToken();
        router.push("/");
        return;
      }
      if (role !== (session.role as Role)) {
        setRole(session.role as Role);
      }
    }

    syncSession();
    const timer = window.setInterval(syncSession, 30000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleNav = navigation.filter((item) => canAccess(role, item.permission));
  const activeNavItem = navigation.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  const handleLogout = () => {
    clearAccessToken();
    router.push("/");
  };

  const getTranslatedLabel = (label: string) => NAV_TRANSLATIONS[language]?.[label] || label;

  const section = pathname.split("/")[1] || "dashboard";
  const hasAccess = canAccess(role, section === "users" ? "users" : section) || section === "notifications";

  if (!mounted) return null;

  const navLinks = (
    <>
      {visibleNav.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            className={cn(
              "group flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-all",
              active
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                : "text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
                active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-700 dark:bg-slate-800"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{getTranslatedLabel(item.label)}</span>
          </Link>
        );
      })}
    </>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="border-b px-5 py-6 dark:border-slate-800">
        <BrandLogo />
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">{navLinks}</nav>
      <div className="border-t p-3 dark:border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/30">
            <LogOut className="h-4 w-4" />
          </span>
          {language === "so" ? "Ka bax" : "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-white shadow-sm lg:block dark:border-slate-800 dark:bg-slate-900">
        {sidebar}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-slate-950/40"
          />
          <div className="relative h-full w-72 border-r bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative hidden w-full max-w-md sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 rounded-md border-slate-200 bg-slate-50 pl-9 text-sm shadow-none focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus:bg-slate-900"
              placeholder={language === "so" ? "Raadi ardayda, darawalada, basaska..." : "Search students, drivers, buses..."}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "so" : "en")}
              className="h-9 gap-2 border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Globe2 className="h-4 w-4 text-blue-600" />
              <span>{language === "en" ? "EN" : "SO"}</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="relative h-9 w-9 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              onClick={() => router.push("/notifications")}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </Button>
          </div>
        </header>

        <main className="px-4 pb-8 pt-2 sm:px-6 lg:px-8">
          {!hasAccess ? (
            <div className="my-8 flex flex-col items-center justify-center rounded-lg border border-rose-100 bg-rose-50/70 p-12 text-center dark:border-rose-950/30 dark:bg-rose-950/10">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Access Denied</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Your account does not have permission to access this section.
              </p>
              <Button onClick={() => router.push("/dashboard")} className="mt-6 bg-blue-600 text-white hover:bg-blue-700">
                Back to Dashboard
              </Button>
            </div>
          ) : (
            <>
              <SessionExpiryBanner />
              <div className="mb-6 mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {activeNavItem
                      ? getTranslatedLabel(activeNavItem.label)
                      : pathname === "/notifications"
                      ? (language === "so" ? "Ogeysiisyada" : "Notifications")
                      : (language === "so" ? "Kormeerka Guud" : "Dashboard")}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {pathname === "/dashboard"
                      ? (language === "so" ? "Ku soo dhawoow. Waa kuwan wixii dhacay maanta." : "Welcome back. Here's what's happening today.")
                      : pathname === "/notifications"
                      ? (language === "so" ? "Wax ku saabsan ogeysiisyada" : "View and manage your notifications")
                      : activeNavItem
                      ? (language === "so"
                          ? `Maamul ${getTranslatedLabel(activeNavItem.label)}`
                          : `Manage ${activeNavItem.label.toLowerCase()}`)
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-white">
                      {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date().toLocaleDateString("en-US", { weekday: "long" })}
                    </div>
                  </div>
                </div>
              </div>
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
