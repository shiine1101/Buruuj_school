"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Download, AlertTriangle, KeyRound, CheckCircle2, Copy, UserPlus, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Dialog, FormField, FormActions, SelectField } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";

type BusProfile = {
  id: string;
  busNumber: string;
  plateNumber: string;
  status: string;
  driver?: { fullName: string } | null;
};

type BackendDriver = {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  status: "ACTIVE" | "ARCHIVED";
  busId: string | null;
  bus: BusProfile | null;
  userId: string | null;
  user?: { username: string } | null;
};

type DriverForm = {
  fullName: string;
  phone: string;
  licenseNumber: string;
  busId: string;
  status: "ACTIVE" | "ARCHIVED";
};

const EMPTY: DriverForm = {
  fullName: "",
  phone: "",
  licenseNumber: "",
  busId: "",
  status: "ACTIVE"
};

type GeneratedCredentials = {
  username: string;
  temporaryPassword: string;
  driverName: string;
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<BackendDriver[]>([]);
  const [buses, setBuses] = useState<BusProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<BackendDriver | null>(null);
  const [form, setForm] = useState<DriverForm>(EMPTY);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [driversData, busesData] = await Promise.all([
        apiFetch<BackendDriver[]>("/drivers"),
        apiFetch<BusProfile[]>("/buses")
      ]);
      setDrivers(driversData);
      setBuses(busesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = drivers.filter((d) =>
    [d.fullName, d.phone, d.licenseNumber, d.status, d.bus?.busNumber ?? "", d.user?.username ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Check if chosen bus is already assigned to another driver
  const selectedBus = buses.find(b => b.id === form.busId);
  const assignedDriver = selectedBus?.driver?.fullName;
  const isBusConflict = form.busId && 
                        assignedDriver && 
                        (!editDriver || editDriver.fullName !== assignedDriver);

  function openAdd() {
    setForm(EMPTY);
    setEditDriver(null);
    setError("");
    setOpen(true);
  }

  function openEdit(index: number) {
    const driver = filtered[index];
    setEditDriver(driver);
    setForm({
      fullName: driver.fullName,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      busId: driver.busId ?? "",
      status: driver.status
    });
    setError("");
    setOpen(true);
  }

  async function handleDelete(index: number) {
    const driver = filtered[index];
    setError("");
    try {
      await apiFetch(`/drivers/${driver.id}/archive`, { method: "PATCH" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive driver.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        phone: form.phone,
        licenseNumber: form.licenseNumber,
        busId: form.busId || undefined,
        status: form.status
      };

      if (editDriver) {
        await apiFetch(`/drivers/${editDriver.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setOpen(false);
      } else {
        await apiFetch("/drivers", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setOpen(false);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save driver.");
    }
  }

  function set(field: keyof DriverForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }



  return (
    <AppShell>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Drivers</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Manage driver profiles, licenses, bus assignments, and login accounts.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadData()} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50 transition-colors">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Driver
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 text-sm font-semibold">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Active: {drivers.filter(d => d.status === "ACTIVE").length}</Badge>
              <Badge className="border-rose-200 bg-rose-50 text-rose-700">Archived: {drivers.filter(d => d.status === "ARCHIVED").length}</Badge>
            </div>
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading drivers...</div>
          ) : (
            <DataTable
              rows={filtered.map((d) => ({
                id: d.id,
                fullName: d.fullName,
                phone: d.phone,
                licenseNumber: d.licenseNumber,
                assignedBus: d.bus ? `${d.bus.busNumber} (${d.bus.plateNumber})` : "Unassigned",
                userAccount: d.user ? d.user.username : "None",
                status: d.status
              }))}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleteLabel="Archive"
            />
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Driver Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title={editDriver ? "Edit Driver" : "Add Driver"}>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {isBusConflict && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold block">Bus Assignment Alert!</span>
                This bus is currently assigned to <strong>{assignedDriver}</strong>. Saving this change will automatically unassign it from {assignedDriver} to maintain exclusivity.
              </div>
            </div>
          )}

          <FormField label="Full Name" required>
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Enter full name" required />
          </FormField>
          <FormField label="Phone Number" required>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Enter phone number" required />
          </FormField>
          <FormField label="License Number" required>
            <Input value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} placeholder="Enter license number" required />
          </FormField>
          <FormField label="Assigned Bus">
            <SelectField
              value={form.busId}
              onChange={(e) => set("busId", e.target.value)}
              options={[
                { value: "", label: "— Unassigned —" },
                ...buses
                  .filter((b) => b.status === "ACTIVE" || b.id === form.busId)
                  .map((b) => ({ value: b.id, label: `${b.busNumber} (${b.plateNumber})` }))
              ]}
            />
          </FormField>
          <FormField label="Status">
            <SelectField value={form.status} onChange={(e) => set("status", e.target.value as "ACTIVE" | "ARCHIVED")}
              options={[{ value: "ACTIVE", label: "Active" }, { value: "ARCHIVED", label: "Archived" }]} />
          </FormField>
          <FormActions onCancel={() => setOpen(false)} submitLabel={editDriver ? "Save Changes" : "Add Driver"} />
        </form>
      </Dialog>
    </AppShell>
  );
}
