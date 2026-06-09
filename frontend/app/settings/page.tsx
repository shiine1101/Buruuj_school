"use client";

import { useState } from "react";
import { AlertCircle, Archive, Bell, Calendar, Database, History, KeyRound, Save, School, Shield, UserCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField, SelectField } from "@/components/ui/dialog";
import { changePasswordWithBackend, getBackendAuthSession, getStoredAuthUser } from "@/lib/api-client";
import { roleLabels } from "@/lib/permissions";

const ACADEMIC_YEARS = Array.from({ length: 2045 - 2009 + 1 }, (_, i) => {
  const yr = String(2045 - i);
  return { value: yr, label: yr };
});

export default function SettingsPage() {
  const [academicYear, setAcademicYear] = useState("2025");
  const [schoolName, setSchoolName] = useState("Buruuj International School");
  const [saved, setSaved] = useState<string | null>(null);
  const [archiveDays, setArchiveDays] = useState("365");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const session = getBackendAuthSession();
  const storedUser = getStoredAuthUser();
  const accountName = storedUser?.fullName ?? session?.email?.split("@")[0] ?? "Account user";
  const accountEmail = storedUser?.email ?? session?.email ?? "";
  const accountRoleValue = session?.role ?? storedUser?.role;
  const accountRole = accountRoleValue && accountRoleValue in roleLabels
    ? roleLabels[accountRoleValue as keyof typeof roleLabels]
    : "User";

  function saveSetting(section: string) {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setAccountError("");
    setAccountMessage("");
    if (passwords.next !== passwords.confirm) {
      setAccountError("New passwords do not match.");
      return;
    }
    if (passwords.next.length < 8) {
      setAccountError("New password must be at least 8 characters.");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePasswordWithBackend(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setAccountMessage("Password updated. Please sign in again on other devices.");
    } catch (err) {
      setAccountError(err instanceof Error ? err.message.replace(/POST \/api\/auth\/change-password failed \(\d+\): /, "") : "Password update failed.");
    } finally {
      setPasswordLoading(false);
    }
  }

  const auditLogs = [
    { action: "Student Created", user: "Admin", time: "Today 10:45 AM", type: "create" },
    { action: "Payment Recorded", user: "Admin", time: "Today 09:30 AM", type: "payment" },
    { action: "Driver Updated", user: "Admin", time: "Yesterday 4:15 PM", type: "update" },
    { action: "Bus Status Changed", user: "Admin", time: "Yesterday 2:00 PM", type: "update" },
    { action: "Admin Login", user: "admin@buruuj.school", time: "Today 08:00 AM", type: "login" },
  ];

  const logColors: Record<string, string> = {
    create: "bg-emerald-100 text-emerald-700",
    payment: "bg-blue-100 text-blue-700",
    update: "bg-amber-100 text-amber-700",
    login: "bg-violet-100 text-violet-700",
  };

  return (
    <AppShell>
      <Card className="mb-6 overflow-hidden">
        <CardHeader className="border-b bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-blue-600" />
              My Account
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">Your account details are shown only in Settings.</p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 pt-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4">
            <FormField label="Full Name">
              <Input value={accountName} readOnly className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300" />
            </FormField>
            <FormField label="Email">
              <Input value={accountEmail} readOnly className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300" />
            </FormField>
            <FormField label="Role">
              <Input value={accountRole} readOnly className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300" />
            </FormField>
          </div>

          <form onSubmit={updatePassword} className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Password</h3>
                <p className="text-xs text-slate-500">Use a strong password with at least 8 characters.</p>
              </div>
            </div>
            <div className="grid gap-3">
              <Input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                placeholder="Current password"
                required
              />
              <Input
                type="password"
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                placeholder="New password"
                required
              />
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Confirm new password"
                required
              />
            </div>
            {accountError && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {accountError}
              </div>
            )}
            {accountMessage && (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                {accountMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={passwordLoading}
              className="mt-4 flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Academic Year */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-600" /> Academic Year</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="Current Academic Year">
              <SelectField value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
                options={ACADEMIC_YEARS} />
            </FormField>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
              ⚠️ Changing the academic year will affect all student and payment records.
            </div>
            <button onClick={() => saveSetting("year")} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors w-fit">
              <Save className="h-4 w-4" /> {saved === "year" ? "✅ Saved!" : "Save Year"}
            </button>
          </CardContent>
        </Card>

        {/* School Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-blue-600" /> School Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="School Name">
              <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
            </FormField>
            <FormField label="Address">
              <Input defaultValue="Mogadishu, Somalia" />
            </FormField>
            <FormField label="Contact Phone">
              <Input defaultValue="+252 61 555 0000" />
            </FormField>
            <button onClick={() => saveSetting("school")} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors w-fit">
              <Save className="h-4 w-4" /> {saved === "school" ? "✅ Saved!" : "Save Info"}
            </button>
          </CardContent>
        </Card>

        {/* Roles & Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-blue-600" /> Roles & Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { role: "Admin", perms: "Full access to all modules" },
              { role: "Financial Officer", perms: "Dashboard, Payments, Maintenance, Reports" },
              { role: "Driver", perms: "Dashboard, My Students, Attendance, My Bus, Breakdown" },
              { role: "Parent", perms: "Dashboard, My Children, Payments, Attendance, Notifications" },
            ].map((r) => (
              <div key={r.role} className="flex items-start gap-3 rounded-lg border p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-black text-sm">{r.role[0]}</div>
                <div>
                  <p className="font-bold text-sm">{r.role}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.perms}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Archive Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-blue-600" /> Archive Policy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="Auto-archive records older than (days)">
              <Input type="number" value={archiveDays} onChange={(e) => setArchiveDays(e.target.value)} min="30" />
            </FormField>
            {[
              { label: "Auto-archive inactive students", checked: true },
              { label: "Auto-archive inactive drivers", checked: true },
              { label: "Delete archived records after 2 years", checked: false },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-slate-50">
                <span className="text-sm font-semibold">{opt.label}</span>
                <input type="checkbox" defaultChecked={opt.checked} className="h-4 w-4 accent-blue-600" />
              </label>
            ))}
            <button onClick={() => saveSetting("archive")} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors w-fit">
              <Save className="h-4 w-4" /> {saved === "archive" ? "✅ Saved!" : "Save Policy"}
            </button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-blue-600" /> Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Email alerts for new payments",
              "SMS for bus breakdowns",
              "WhatsApp for attendance updates",
              "Weekly summary report email",
              "Low payment warnings",
            ].map((label) => (
              <label key={label} className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-slate-50">
                <span className="text-sm font-semibold">{label}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-600" />
              </label>
            ))}
            <button onClick={() => saveSetting("notif")} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors w-fit">
              <Save className="h-4 w-4" /> {saved === "notif" ? "✅ Saved!" : "Save Settings"}
            </button>
          </CardContent>
        </Card>

        {/* Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-blue-600" /> Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm font-bold text-emerald-700">✅ Last backup: Today at 02:00 AM</p>
              <p className="text-xs text-emerald-600 mt-1">Automatic daily backups are enabled.</p>
            </div>
            <button className="w-full rounded-md border border-blue-600 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors">
              📦 Create Manual Backup Now
            </button>
            <button className="w-full rounded-md border py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
              📂 View Backup History
            </button>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-blue-600" /> Audit Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {auditLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${logColors[log.type]}`}>
                    {log.type.toUpperCase()}
                  </span>
                  <p className="text-sm font-semibold">{log.action}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700">{log.user}</p>
                  <p className="text-xs text-slate-400">{log.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}
