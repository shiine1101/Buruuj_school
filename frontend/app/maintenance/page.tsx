"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Download, Fuel, Wrench, AlertTriangle, Calendar, CheckCircle, Info } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Dialog, FormField, FormActions, SelectField } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppStore, type Maintenance } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";

const today = new Date().toISOString().slice(0, 10);

const EMPTY: Maintenance = {
  type: "Fuel",
  bus: "",
  cost: "",
  description: "",
  status: "InProgress",
  date: today,
  odometer: "",
  fuelQuantity: "",
  fuelType: "Diesel",
  receiptNumber: "",
  notes: "",
  category: "Engine",
  severity: "Medium",
  location: "",
  estimatedCost: "",
  repairCategory: "",
  workshopName: "",
  technician: ""
};

export default function MaintenancePage() {
  const { role, maintenance, addMaintenance, updateMaintenance, deleteMaintenance, buses } = useAppStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Maintenance>(EMPTY);

  // Driver states
  const [driverBus, setDriverBus] = useState<{ busId: string | null; busNumber: string | null } | null>(null);
  const [driverFuelRecords, setDriverFuelRecords] = useState<any[]>([]);
  const [driverBreakdowns, setDriverBreakdowns] = useState<any[]>([]);
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverError, setDriverError] = useState("");
  const [driverActiveTab, setDriverActiveTab] = useState<"fuel" | "breakdown" | "repair">("fuel");
  const [driverActionType, setDriverActionType] = useState<"Fuel" | "Breakdown" | "Repair">("Fuel");

  const loadDriverData = useCallback(async () => {
    setDriverLoading(true);
    setDriverError("");
    try {
      const busData = await apiFetch<{ busId: string | null; busNumber: string | null }>("/students/my-bus");
      setDriverBus(busData);
      
      const [fuels, breakdowns] = await Promise.all([
        apiFetch<any[]>("/maintenance/fuel"),
        apiFetch<any[]>("/maintenance/breakdowns")
      ]);
      setDriverFuelRecords(fuels);
      setDriverBreakdowns(breakdowns);
    } catch (err) {
      setDriverError(err instanceof Error ? err.message : "Failed to load driver maintenance data.");
    } finally {
      setDriverLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "DRIVER") {
      void loadDriverData();
    }
  }, [role, loadDriverData]);

  // Admin filter
  const filtered = maintenance.filter((m) =>
    Object.values(m).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const totalCost = maintenance.reduce((sum, m) => sum + Number(String(m.cost || m.estimatedCost).replace(/[^0-9.]/g, "") || 0), 0);
  const fuelCost = maintenance.filter((m) => m.type === "Fuel").reduce((sum, m) => sum + Number(String(m.cost).replace(/[^0-9.]/g, "") || 0), 0);
  const breakdownCost = maintenance.filter((m) => m.type === "Breakdown" || m.type === "Repair").reduce((sum, m) => sum + Number(String(m.cost || m.estimatedCost).replace(/[^0-9.]/g, "") || 0), 0);

  function openAdd() {
    if (role === "DRIVER") {
      setForm({ 
        ...EMPTY, 
        date: today, 
        bus: driverBus?.busNumber ?? "",
        type: "Fuel"
      });
    } else {
      setForm({ ...EMPTY, date: today });
    }
    setEditIndex(null);
    setOpen(true);
  }

  function openEdit(index: number) {
    const actual = maintenance.indexOf(filtered[index]);
    setForm({ ...EMPTY, ...maintenance[actual] });
    setEditIndex(actual);
    setOpen(true);
  }

  function handleDelete(index: number) {
    deleteMaintenance(maintenance.indexOf(filtered[index]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (role === "DRIVER") {
      if (!driverBus?.busId) return;
      setDriverLoading(true);
      setDriverError("");
      try {
        if (form.type === "Fuel") {
          const payload = {
            busId: driverBus.busId,
            liters: Number(form.fuelQuantity),
            cost: 0,
            date: new Date(form.date ?? today).toISOString(),
            notes: form.notes || undefined
          };
          await apiFetch("/maintenance/fuel", {
            method: "POST",
            body: JSON.stringify(payload)
          });
        } else {
          const payload = {
            busId: driverBus.busId,
            problem: form.type === "Repair" ? `Repair: ${form.category ?? "General"}` : form.category ?? "Engine",
            description: form.description,
            date: new Date(form.date ?? today).toISOString()
          };
          await apiFetch("/maintenance/breakdowns", {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }
        setOpen(false);
        await loadDriverData();
      } catch (err) {
        setDriverError(err instanceof Error ? err.message : "Failed to submit maintenance entry.");
      } finally {
        setDriverLoading(false);
      }
      return;
    }

    const payload = {
      ...form,
      cost: form.type === "Breakdown" ? form.estimatedCost || form.cost : form.cost,
      description:
        form.type === "Fuel"
          ? `${form.fuelType} fuel — ${form.fuelQuantity}L @ odometer ${form.odometer}`
          : form.type === "Breakdown"
          ? `${form.category} (${form.severity}) — ${form.description}`
          : form.description
    };
    if (editIndex !== null) updateMaintenance(editIndex, payload);
    else addMaintenance(payload);
    setOpen(false);
  }

  function set<K extends keyof Maintenance>(field: K, value: Maintenance[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const busOptions = [{ value: "", label: "— Select Bus —" }, ...buses.map((b) => ({ value: b.busNumber, label: `${b.busNumber} (${b.plateNumber})` }))];

  if (role === "DRIVER") {
    return (
      <AppShell>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Driver Maintenance & Fuel Logs</h1>
            <p className="text-sm text-slate-500">Record fuel refills and report mechanical issues directly to the administration.</p>
          </div>
          {driverBus?.busId && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
              <label className="text-xs font-bold uppercase text-slate-500" htmlFor="driver-maintenance-type">Maintenance Type</label>
              <select
                id="driver-maintenance-type"
                value={driverActionType}
                onChange={(event) => setDriverActionType(event.target.value as "Fuel" | "Breakdown" | "Repair")}
                className="rounded-md border bg-white px-3 py-2 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="Fuel">Fuel</option>
                <option value="Breakdown">Breakdown</option>
                <option value="Repair">Repair</option>
              </select>
              <button 
                onClick={() => {
                  setForm({ ...EMPTY, type: driverActionType, bus: driverBus.busNumber ?? "", date: today });
                  setOpen(true);
                }} 
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Maintenance
              </button>
            </div>
          )}
        </div>

        {driverError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{driverError}</span>
          </div>
        )}

        {/* Bus Assigned Details Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Assigned Bus Details</CardTitle>
          </CardHeader>
          <CardContent>
            {driverBus === null || driverLoading ? (
              <div className="text-sm text-slate-500">Loading assigned bus status...</div>
            ) : !driverBus.busId ? (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-semibold">No Bus Assigned</h4>
                  <p className="text-xs mt-1">You are currently not assigned to any bus in the system. Fuel refills and breakdown reporting will be enabled once a bus is assigned to you by the administrator.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30">
                    <Fuel className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Bus Number</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{driverBus.busNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Active Status</span>
                    <span className="text-lg font-black text-emerald-700">Ready to Travel</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Unresolved Issues</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {driverBreakdowns.filter(b => b.status === "InProgress").length} reported
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tab Selection */}
        <div className="flex rounded-md border bg-slate-50 p-1 dark:bg-slate-950 mb-4 max-w-md">
          <button
            type="button"
            onClick={() => setDriverActiveTab("fuel")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              driverActiveTab === "fuel" ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Fuel Records
          </button>
          <button
            type="button"
            onClick={() => setDriverActiveTab("breakdown")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              driverActiveTab === "breakdown" ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Breakdowns
          </button>
          <button
            type="button"
            onClick={() => setDriverActiveTab("repair")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              driverActiveTab === "repair" ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Repairs
          </button>
        </div>

        {/* Data list */}
        <Card>
          <CardHeader>
            <CardTitle>{driverActiveTab === "fuel" ? "Fuel Records" : driverActiveTab === "repair" ? "Repair Requests" : "Breakdown Reports"}</CardTitle>
          </CardHeader>
          <CardContent>
            {driverLoading ? (
              <div className="text-center py-12 text-sm text-slate-500">Loading data...</div>
            ) : driverActiveTab === "fuel" ? (
              <DataTable 
                rows={driverFuelRecords.map(f => ({
                  date: new Date(f.date).toLocaleDateString(),
                  liters: `${f.liters} Liters`,
                  notes: f.notes ?? "—"
                }))}
              />
            ) : (
              <DataTable 
                rows={driverBreakdowns
                  .filter((b) => driverActiveTab === "repair" ? String(b.problem).startsWith("Repair") : !String(b.problem).startsWith("Repair"))
                  .map(b => ({
                  date: new Date(b.date).toLocaleDateString(),
                  problem: b.problem,
                  description: b.description,
                  status: b.status
                }))}
              />
            )}
          </CardContent>
        </Card>

        {/* Driver specific dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} title={`${form.type} Form`}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormField label="Assigned Bus">
              <Input value={driverBus?.busNumber ?? ""} disabled />
            </FormField>

            <FormField label="Date" required>
              <Input type="date" value={form.date ?? today} onChange={(e) => set("date", e.target.value)} required />
            </FormField>

            {form.type === "Fuel" ? (
              <>
                <FormField label="Fuel Quantity (Liters)" required>
                  <Input type="number" min="1" step="any" value={form.fuelQuantity ?? ""} onChange={(e) => set("fuelQuantity", e.target.value)} required placeholder="e.g. 50" />
                </FormField>
                <FormField label="Notes">
                  <Input value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Shell station, full tank" />
                </FormField>
              </>
            ) : (
              <>
                <FormField label={form.type === "Repair" ? "Repair Type" : "Problem Category"} required>
                  <SelectField 
                    value={form.category ?? "Engine"} 
                    onChange={(e) => set("category", e.target.value)} 
                    options={(form.type === "Repair" ? ["Service", "Engine", "Tire", "Battery", "Electrical", "Brake", "Other"] : ["Engine", "Tire", "Battery", "Electrical", "Brake", "Other"]).map((v) => ({ value: v, label: v }))} 
                  />
                </FormField>
                <FormField label={form.type === "Repair" ? "Repair Details" : "Description of Problem"} required>
                  <Input value={form.description} onChange={(e) => set("description", e.target.value)} required placeholder="Provide details about the issue" />
                </FormField>
              </>
            )}

            <FormActions onCancel={() => setOpen(false)} submitLabel="Submit Report" />
          </form>
        </Dialog>
      </AppShell>
    );
  }

  // Admin View
  return (
    <AppShell>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Cost", value: `$${totalCost.toLocaleString()}`, cls: "bg-blue-50 text-blue-700" },
          { label: "Fuel Cost", value: `$${fuelCost.toLocaleString()}`, cls: "bg-emerald-50 text-emerald-700" },
          { label: "Breakdown / Repair Cost", value: `$${breakdownCost.toLocaleString()}`, cls: "bg-orange-50 text-orange-700" }
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-5 font-bold shadow-sm ${c.cls}`}>
            <p className="text-sm">{c.label}</p>
            <p className="mt-1 text-3xl">{c.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Maintenance</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Track fuel records, breakdowns, repairs, and service status.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={openAdd} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Add Record
            </button>
            <button className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search maintenance..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DataTable rows={filtered} onEdit={openEdit} onDelete={handleDelete} deleteLabel="Archive" />
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editIndex !== null ? "Edit Record" : "Add Maintenance Record"} size="lg">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" required>
            <SelectField
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              options={[
                { value: "Fuel", label: "Fuel" },
                { value: "Breakdown", label: "Breakdown" },
                { value: "Repair", label: "Repair" }
              ]}
            />
          </FormField>
          <FormField label="Bus" required>
            <SelectField value={form.bus} onChange={(e) => set("bus", e.target.value)} options={busOptions} />
          </FormField>
          <FormField label="Date" required>
            <Input type="date" value={form.date ?? today} onChange={(e) => set("date", e.target.value)} required />
          </FormField>

          {form.type === "Fuel" && (
            <>
              <FormField label="Odometer Reading" required><Input value={form.odometer ?? ""} onChange={(e) => set("odometer", e.target.value)} required /></FormField>
              <FormField label="Fuel Quantity (Liters)" required><Input value={form.fuelQuantity ?? ""} onChange={(e) => set("fuelQuantity", e.target.value)} required /></FormField>
              <FormField label="Fuel Cost" required><Input value={form.cost} onChange={(e) => set("cost", e.target.value)} required /></FormField>
              <FormField label="Fuel Type" required>
                <SelectField value={form.fuelType ?? "Diesel"} onChange={(e) => set("fuelType", e.target.value)} options={[{ value: "Diesel", label: "Diesel" }, { value: "Petrol", label: "Petrol" }]} />
              </FormField>
              <FormField label="Receipt Number"><Input value={form.receiptNumber ?? ""} onChange={(e) => set("receiptNumber", e.target.value)} /></FormField>
              <FormField label="Notes"><Input value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></FormField>
            </>
          )}

          {form.type === "Breakdown" && (
            <>
              <FormField label="Breakdown Category" required>
                <SelectField value={form.category ?? "Engine"} onChange={(e) => set("category", e.target.value)} options={["Engine", "Tire", "Battery", "Electrical", "Brake", "Other"].map((v) => ({ value: v, label: v }))} />
              </FormField>
              <FormField label="Severity" required>
                <SelectField value={form.severity ?? "Medium"} onChange={(e) => set("severity", e.target.value)} options={["Low", "Medium", "High", "Critical"].map((v) => ({ value: v, label: v }))} />
              </FormField>
              <FormField label="Location"><Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} /></FormField>
              <FormField label="Estimated Cost"><Input value={form.estimatedCost ?? ""} onChange={(e) => set("estimatedCost", e.target.value)} /></FormField>
              <div className="sm:col-span-2">
                <FormField label="Description" required>
                  <Input value={form.description} onChange={(e) => set("description", e.target.value)} required />
                </FormField>
              </div>
            </>
          )}

          {form.type === "Repair" && (
            <>
              <FormField label="Repair Category" required><Input value={form.repairCategory ?? ""} onChange={(e) => set("repairCategory", e.target.value)} required /></FormField>
              <FormField label="Workshop Name" required><Input value={form.workshopName ?? ""} onChange={(e) => set("workshopName", e.target.value)} required /></FormField>
              <FormField label="Technician"><Input value={form.technician ?? ""} onChange={(e) => set("technician", e.target.value)} /></FormField>
              <FormField label="Cost" required><Input value={form.cost} onChange={(e) => set("cost", e.target.value)} required /></FormField>
              <div className="sm:col-span-2">
                <FormField label="Notes"><Input value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></FormField>
              </div>
            </>
          )}

          <FormField label="Status">
            <SelectField value={form.status} onChange={(e) => set("status", e.target.value)} options={[{ value: "InProgress", label: "In Progress" }, { value: "Completed", label: "Completed" }]} />
          </FormField>
          <div className="sm:col-span-2"><FormActions onCancel={() => setOpen(false)} submitLabel={editIndex !== null ? "Save Changes" : "Add Record"} /></div>
        </form>
      </Dialog>
    </AppShell>
  );
}
