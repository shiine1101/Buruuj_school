"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Dialog, FormField, FormActions, SelectField } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";

type BackendBus = {
  id: string;
  busNumber: string;
  plateNumber: string;
  capacity: number;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE" | "ARCHIVED";
  driver?: { fullName: string } | null;
};

type BusForm = {
  busNumber: string;
  plateNumber: string;
  capacity: number;
  status: "Active" | "Maintenance" | "OutOfService";
};

const EMPTY: BusForm = { busNumber: "", plateNumber: "", capacity: 0, status: "Active" };

function dbStatusToForm(status: BackendBus["status"]): BusForm["status"] {
  if (status === "ACTIVE") return "Active";
  if (status === "MAINTENANCE") return "Maintenance";
  return "OutOfService";
}

export default function BusesPage() {
  const [buses, setBuses] = useState<BackendBus[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editBus, setEditBus] = useState<BackendBus | null>(null);
  const [form, setForm] = useState<BusForm>(EMPTY);
  const [error, setError] = useState("");

  const loadBuses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<BackendBus[]>("/buses");
      setBuses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load buses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBuses();
  }, [loadBuses]);

  const filtered = buses.filter((b) =>
    [b.busNumber, b.plateNumber, b.driver?.fullName ?? "", b.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function openAdd() {
    setForm(EMPTY);
    setEditBus(null);
    setError("");
    setOpen(true);
  }

  function openEdit(index: number) {
    const bus = filtered[index];
    setEditBus(bus);
    setForm({
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      capacity: bus.capacity,
      status: dbStatusToForm(bus.status)
    });
    setError("");
    setOpen(true);
  }

  async function handleDelete(index: number) {
    const bus = filtered[index];
    setError("");
    try {
      await apiFetch(`/buses/${bus.id}/archive`, { method: "PATCH" });
      await loadBuses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive bus.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const statusMap: Record<BusForm["status"], BackendBus["status"]> = {
        Active: "ACTIVE",
        Maintenance: "MAINTENANCE",
        OutOfService: "OUT_OF_SERVICE"
      };

      const payload = {
        busNumber: form.busNumber,
        plateNumber: form.plateNumber,
        capacity: Number(form.capacity),
        status: statusMap[form.status]
      };

      if (editBus) {
        await apiFetch(`/buses/${editBus.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/buses", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setOpen(false);
      await loadBuses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bus.");
    }
  }

  function set(field: keyof BusForm, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Buses</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Manage bus capacity, plate numbers, driver assignments, and service state.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={openAdd} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Bus
            </button>
            <button onClick={() => loadBuses()} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50 transition-colors">
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search buses..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 text-sm">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Active: {buses.filter(b => b.status === "ACTIVE").length}</Badge>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">Maintenance: {buses.filter(b => b.status === "MAINTENANCE").length}</Badge>
              <Badge className="border-rose-200 bg-rose-50 text-rose-700">Out of Service: {buses.filter(b => b.status === "OUT_OF_SERVICE").length}</Badge>
            </div>
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading buses...</div>
          ) : (
            <DataTable
              rows={filtered.map((b) => ({
                id: b.id,
                busNumber: b.busNumber,
                plateNumber: b.plateNumber,
                capacity: `${b.capacity} seats`,
                driver: b.driver ? b.driver.fullName : "Unassigned",
                status: b.status === "ACTIVE" ? "Active" : b.status === "MAINTENANCE" ? "Maintenance" : "Out of Service"
              }))}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleteLabel="Archive"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editBus ? "Edit Bus" : "Add Bus"}>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <FormField label="Bus Number" required>
            <Input value={form.busNumber} onChange={(e) => set("busNumber", e.target.value)} placeholder="Enter bus number" required />
          </FormField>
          <FormField label="Plate Number" required>
            <Input value={form.plateNumber} onChange={(e) => set("plateNumber", e.target.value)} placeholder="Enter plate number" required />
          </FormField>
          <FormField label="Seating Capacity" required>
            <Input type="number" value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} min={1} required />
          </FormField>
          <FormField label="Status">
            <SelectField value={form.status} onChange={(e) => set("status", e.target.value as BusForm["status"])}
              options={[
                { value: "Active", label: "Active" },
                { value: "Maintenance", label: "Maintenance" },
                { value: "OutOfService", label: "Out of Service" }
              ]} />
          </FormField>
          <FormActions onCancel={() => setOpen(false)} submitLabel={editBus ? "Save Changes" : "Add Bus"} />
        </form>
      </Dialog>
    </AppShell>
  );
}
