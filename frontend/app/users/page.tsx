"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Link2, Plus, RefreshCw, Search, Shield, ShieldOff, Trash2, UserCog } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { Dialog, FormActions, FormField, SelectField } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";

type DriverProfile = {
  id: string;
  fullName: string;
  bus: { busNumber: string } | null;
};

type ManagedUser = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "DRIVER" | "FINANCIAL_OFFICER";
  status: "ACTIVE" | "DISABLED";
  driver?: DriverProfile | null;
};

const EMPTY = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  role: "DRIVER" as ManagedUser["role"],
  driverId: ""
};

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [error, setError] = useState("");
  const [unlinkedDrivers, setUnlinkedDrivers] = useState<DriverProfile[]>([]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ManagedUser[]>("/users");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnlinkedDrivers = useCallback(async () => {
    try {
      const allDrivers = await apiFetch<any[]>("/drivers");
      // Unlinked = drivers that have no userId set
      const unlinked = allDrivers
        .filter((d: any) => !d.userId && d.status === "ACTIVE")
        .map((d: any) => ({
          id: d.id,
          fullName: d.fullName,
          bus: d.bus ?? null
        }));
      setUnlinkedDrivers(unlinked);
    } catch {
      // Silently ignore if drivers endpoint fails
      setUnlinkedDrivers([]);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = users.filter((user) =>
    [user.fullName, user.username, user.email, user.role, user.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function openCreate() {
    setEditUser(null);
    setForm(EMPTY);
    void loadUnlinkedDrivers();
    setOpen(true);
  }

  function openEdit(index: number) {
    const user = filtered[index];
    setEditUser(user);
    setForm({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone ?? "",
      password: "",
      role: user.role,
      driverId: user.driver?.id ?? ""
    });
    void loadUnlinkedDrivers();
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editUser) {
        const payload: Record<string, unknown> = {
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role
        };
        if (form.role === "DRIVER" && form.driverId) {
          payload.driverId = form.driverId;
        }
        await apiFetch(`/users/${editUser.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        const payload: Record<string, unknown> = { ...form };
        if (form.role !== "DRIVER") {
          delete payload.driverId;
        }
        await apiFetch("/users", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setOpen(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user.");
    }
  }

  async function toggleStatus(user: ManagedUser) {
    await apiFetch(`/users/${user.id}/${user.status === "ACTIVE" ? "disable" : "activate"}`, { method: "PATCH" });
    await loadUsers();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await apiFetch(`/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await loadUsers();
  }

  async function submitResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    await apiFetch(`/users/${resetTarget.id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password: resetPassword })
    });
    setResetTarget(null);
    setResetPassword("");
  }

  // Build driver options: unlinked drivers + currently linked driver (for edit)
  const driverOptions = [...unlinkedDrivers];
  if (editUser?.driver && !driverOptions.find(d => d.id === editUser.driver?.id)) {
    driverOptions.unshift(editUser.driver);
  }

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Users</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Create and manage system accounts for Admin, Driver, and Financial Officer roles.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadUsers()} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Create User
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading users...</div>
          ) : (
            <div className="space-y-3">
              <DataTable
                rows={filtered.map((user) => ({
                  fullName: user.fullName,
                  username: user.username,
                  email: user.email,
                  phone: user.phone ?? "—",
                  role: user.role.replace("_", " "),
                  status: user.status,
                  linkedDriver: user.driver ? `${user.driver.fullName}${user.driver.bus ? ` (${user.driver.bus.busNumber})` : ""}` : user.role === "DRIVER" ? "⚠ Not linked" : "—"
                }))}
                onEdit={openEdit}
                onDelete={(index) => setDeleteTarget(filtered[index])}
              />
              <div className="flex flex-wrap gap-2">
                {filtered.map((user) => (
                  <div key={user.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs dark:border-slate-800">
                    <span className="font-semibold">{user.fullName}</span>
                    <Badge className={user.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>
                      {user.status}
                    </Badge>
                    {user.role === "DRIVER" && (
                      <Badge className={user.driver ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                        <Link2 className="h-3 w-3 inline mr-1" />
                        {user.driver ? user.driver.fullName : "Unlinked"}
                      </Badge>
                    )}
                    <button onClick={() => toggleStatus(user)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-semibold hover:bg-slate-50">
                      {user.status === "ACTIVE" ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                      {user.status === "ACTIVE" ? "Disable" : "Activate"}
                    </button>
                    <button onClick={() => { setResetTarget(user); setResetPassword(""); }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-semibold hover:bg-slate-50">
                      <KeyRound className="h-3.5 w-3.5" /> Reset Password
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editUser ? "Edit User" : "Create User"}>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" required><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></FormField>
          <FormField label="Username" required><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></FormField>
          <FormField label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FormField>
          <FormField label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          {!editUser && (
            <div className="sm:col-span-2">
              <FormField label="Password" required>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
              </FormField>
            </div>
          )}
          <FormField label="Role" required>
            <SelectField
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as ManagedUser["role"], driverId: "" })}
              options={[
                { value: "ADMIN", label: "Admin" },
                { value: "DRIVER", label: "Driver" },
                { value: "FINANCIAL_OFFICER", label: "Financial Officer" }
              ]}
            />
          </FormField>

          {/* Driver Profile Selector — Required for DRIVER role */}
          {form.role === "DRIVER" && (
            <FormField label="Linked Driver Profile" required>
              {driverOptions.length === 0 && !editUser?.driver ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-semibold">No unlinked driver profiles available.</p>
                  <p className="mt-1">Create a driver profile first from the <strong>Drivers</strong> page, then come back to link it.</p>
                </div>
              ) : (
                <SelectField
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                  options={[
                    { value: "", label: "— Select Driver Profile —" },
                    ...driverOptions.map((d) => ({
                      value: d.id,
                      label: `${d.fullName}${d.bus ? ` → ${d.bus.busNumber}` : " (No bus)"}`
                    }))
                  ]}
                />
              )}
            </FormField>
          )}

          {/* Info box for Driver role */}
          {form.role === "DRIVER" && (
            <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> Driver ↔ User Linking Rules</p>
              <p>• Each Driver profile can be linked to exactly <strong>one</strong> User account.</p>
              <p>• Each User account can be linked to exactly <strong>one</strong> Driver profile.</p>
              <p>• The driver will only see: My Bus, My Students, Attendance, Live Tracking, Breakdown Reports.</p>
              <p>• Payment amounts are hidden from drivers — they see only <strong>Paid</strong> or <strong>Unpaid</strong> status.</p>
            </div>
          )}

          <div className="sm:col-span-2"><FormActions onCancel={() => setOpen(false)} submitLabel={editUser ? "Save Changes" : "Create User"} /></div>
        </form>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget?.fullName ?? ""}`}>
        <form onSubmit={submitResetPassword} className="grid gap-4">
          <FormField label="New Password" required>
            <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} minLength={8} required />
          </FormField>
          <FormActions onCancel={() => setResetTarget(null)} submitLabel="Reset Password" />
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Disable User"
        message={`Disable ${deleteTarget?.fullName ?? "this user"}? They will no longer be able to sign in.`}
        confirmLabel="Disable User"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
