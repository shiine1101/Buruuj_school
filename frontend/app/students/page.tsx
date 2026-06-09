"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Download, Upload, AlertTriangle, CheckCircle, Info, FileSpreadsheet } from "lucide-react";
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
  status: string;
};

type BackendStudent = {
  id: string; // DB internal ID
  studentId: string; // shown ID, e.g. STU-001
  fullName: string;
  shift: "MORNING" | "AFTERNOON" | "VOCATIONAL";
  parentName: string | null;
  parentPhone: string | null;
  pickupPoint: string;
  busId: string | null;
  status: "ACTIVE" | "ARCHIVED";
  academicYear: string;
  bus?: BackendBus | null;
};

type StudentForm = {
  studentId: string;
  fullName: string;
  shift: "MORNING" | "AFTERNOON" | "VOCATIONAL";
  parentName: string;
  parentPhone: string;
  pickupPoint: string;
  busId: string;
  status: "ACTIVE" | "ARCHIVED";
  academicYear: string;
};

const EMPTY: StudentForm = {
  studentId: "",
  fullName: "",
  shift: "MORNING",
  parentName: "",
  parentPhone: "",
  pickupPoint: "",
  busId: "",
  status: "ACTIVE",
  academicYear: "2025-2026"
};

const ACADEMIC_YEARS = Array.from({ length: 2045 - 2009 }, (_, i) => {
  const start = 2009 + i;
  const val = `${start}-${start + 1}`;
  return { value: val, label: val };
}).reverse();

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";")) delimiter = ";";

  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
  const parsed: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const record: any = {};
    headers.forEach((header, index) => {
      const val = values[index] ? values[index].replace(/^["']|["']$/g, "") : "";
      if (header.includes("id")) record.id = val;
      else if (header.includes("name") && !header.includes("parent")) record.fullName = val;
      else if (header.includes("shift")) record.shift = val;
      else if (header.includes("parent name") || (header.includes("parent") && !header.includes("phone"))) record.parentName = val;
      else if (header.includes("phone")) record.parentPhone = val;
      else if (header.includes("pickup") || header.includes("point")) record.pickupPoint = val;
      else if (header.includes("bus")) record.bus = val;
      else if (header.includes("status")) record.status = val;
      else if (header.includes("year") || header.includes("academic")) record.academicYear = val;
    });

    if (record.fullName) {
      parsed.push({
        id: record.id || "",
        fullName: record.fullName,
        shift: record.shift || "Morning",
        parentName: record.parentName || "",
        parentPhone: record.parentPhone || "",
        pickupPoint: record.pickupPoint || "",
        bus: record.bus || "",
        status: record.status || "Active",
        academicYear: record.academicYear || "2025-2026"
      });
    }
  }
  return parsed;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [buses, setBuses] = useState<BackendBus[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<BackendStudent | null>(null);
  const [form, setForm] = useState<StudentForm>(EMPTY);
  const [error, setError] = useState("");

  const [importText, setImportText] = useState("");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [overwrite, setOverwrite] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [studentsData, busesData] = await Promise.all([
        apiFetch<BackendStudent[]>("/students"),
        apiFetch<BackendBus[]>("/buses")
      ]);
      setStudents(studentsData);
      setBuses(busesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = students.filter((s) =>
    [s.studentId, s.fullName, s.parentName ?? "", s.parentPhone ?? "", s.pickupPoint, s.bus?.busNumber ?? "", s.status, s.academicYear]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const isDuplicateId = form.studentId.trim() !== "" && !editStudent && students.some(s => s.studentId === form.studentId);
  const isDuplicateName = form.fullName && !editStudent && students.some(s => s.fullName.toLowerCase() === form.fullName.toLowerCase());

  function openAdd() {
    setForm(EMPTY);
    setEditStudent(null);
    setError("");
    setOpen(true);
  }

  function openEdit(index: number) {
    const student = filtered[index];
    setEditStudent(student);
    setForm({
      studentId: student.studentId,
      fullName: student.fullName,
      shift: student.shift,
      parentName: student.parentName ?? "",
      parentPhone: student.parentPhone ?? "",
      pickupPoint: student.pickupPoint,
      busId: student.busId ?? "",
      status: student.status,
      academicYear: student.academicYear
    });
    setError("");
    setOpen(true);
  }

  async function handleDelete(index: number) {
    const student = filtered[index];
    setError("");
    try {
      await apiFetch(`/students/${student.id}/archive`, { method: "PATCH" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive student.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudent && isDuplicateId) return;
    setError("");

    try {
      const payload = {
        studentId: form.studentId,
        fullName: form.fullName,
        shift: form.shift,
        parentName: form.parentName || undefined,
        parentPhone: form.parentPhone || undefined,
        pickupPoint: form.pickupPoint,
        busId: form.busId || undefined,
        academicYear: form.academicYear,
        status: form.status
      };

      if (editStudent) {
        await apiFetch(`/students/${editStudent.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/students", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save student.");
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const cleanList = parsedData.filter(p => p.fullName);
      for (const item of cleanList) {
        const existing = students.find(
          (s) =>
            (item.id && s.studentId.toLowerCase() === item.id.toLowerCase()) ||
            (s.fullName.toLowerCase() === item.fullName?.toLowerCase())
        );

        const matchedBus = buses.find(b => b.busNumber === item.bus);

        const payload = {
          studentId: item.id || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName: item.fullName,
          shift: (item.shift?.toUpperCase() === "AFTERNOON" ? "AFTERNOON" : item.shift?.toUpperCase() === "VOCATIONAL" ? "VOCATIONAL" : "MORNING") as any,
          parentName: item.parentName || undefined,
          parentPhone: item.parentPhone || undefined,
          pickupPoint: item.pickupPoint || "General",
          busId: matchedBus?.id || undefined,
          academicYear: item.academicYear || "2025-2026",
          status: item.status?.toUpperCase() === "ARCHIVED" ? "ARCHIVED" : "ACTIVE"
        };

        if (existing) {
          if (overwrite) {
            await apiFetch(`/students/${existing.id}`, {
              method: "PATCH",
              body: JSON.stringify(payload)
            });
          }
        } else {
          await apiFetch("/students", {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }
      }
      setImportOpen(false);
      setParsedData([]);
      setImportText("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import students.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
      setParsedData(parseCSV(text));
    };
    reader.readAsText(file);
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setImportText(text);
    setParsedData(parseCSV(text));
  }

  function set(field: keyof StudentForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function downloadSampleCSV() {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Student ID,Full Name,Shift,Parent Name,Parent Phone,Pickup Point,Assigned Bus,Status,Academic Year\n"
      + "STU-9901,Fahma Aden,Morning,Aden Yusuf,+252 61 555 4910,Hodan,BUS-101,Active,2025-2026\n"
      + "STU-9902,Saeed Ali,Afternoon,Ali Warsame,+252 61 555 3320,Waberi,BUS-108,Active,2025-2026\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Students</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Manage student records, bus assignments, and archive status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
              <Upload className="h-4 w-4" /> Bulk Import
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" /> Add Student
            </button>
            <button onClick={downloadSampleCSV} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50 transition-colors">
              <Download className="h-4 w-4" /> Download Template
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 text-sm font-semibold">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Active: {students.filter(s => s.status === "ACTIVE").length}</Badge>
              <Badge className="border-rose-200 bg-rose-50 text-rose-700">Archived: {students.filter(s => s.status === "ARCHIVED").length}</Badge>
            </div>
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading students...</div>
          ) : (
            <DataTable
              rows={filtered.map((s) => ({
                id: s.id,
                studentId: s.studentId,
                fullName: s.fullName,
                shift: s.shift.charAt(0) + s.shift.slice(1).toLowerCase(),
                parentName: s.parentName ?? "—",
                parentPhone: s.parentPhone ?? "—",
                pickupPoint: s.pickupPoint,
                bus: s.bus ? `${s.bus.busNumber} (${s.bus.plateNumber})` : "— Unassigned —",
                status: s.status === "ACTIVE" ? "Active" : "Archived",
                academicYear: s.academicYear
              }))}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleteLabel="Archive"
            />
          )}
        </CardContent>
      </Card>

      {/* Single Add / Edit Student Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title={editStudent ? "Edit Student" : "Add Student"} size="lg">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {!editStudent && (isDuplicateId || isDuplicateName) && (
            <div className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold block">Potential Duplicate Detected!</span>
                {isDuplicateId && <p>• Student ID "{form.studentId}" already exists in the system.</p>}
                {isDuplicateName && <p>• A student named "{form.fullName}" is already registered.</p>}
              </div>
            </div>
          )}

          <FormField label="Full Name" required>
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Enter full name" required />
          </FormField>
          <FormField label="Student ID" required>
            <Input value={form.studentId} onChange={(e) => set("studentId", e.target.value)} placeholder="Enter Student ID (e.g. STU-001)" required />
          </FormField>
          <FormField label="Shift" required>
            <SelectField value={form.shift} onChange={(e) => set("shift", e.target.value as any)}
              options={[{ value: "MORNING", label: "Morning" }, { value: "AFTERNOON", label: "Afternoon" }, { value: "VOCATIONAL", label: "Vocational" }]} />
          </FormField>
          <FormField label="Academic Year" required>
            <SelectField value={form.academicYear} onChange={(e) => set("academicYear", e.target.value)}
              options={ACADEMIC_YEARS} />
          </FormField>
          <FormField label="Parent Name" required>
            <Input value={form.parentName} onChange={(e) => set("parentName", e.target.value)} placeholder="Enter parent name" required />
          </FormField>
          <FormField label="Parent Phone" required>
            <Input value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} placeholder="Enter phone number" required />
          </FormField>
          <FormField label="Pickup Point" required>
            <Input value={form.pickupPoint} onChange={(e) => set("pickupPoint", e.target.value)} placeholder="Enter pickup point" required />
          </FormField>
          <FormField label="Assigned Bus">
            <SelectField
              value={form.busId}
              onChange={(e) => set("busId", e.target.value)}
              options={[
                { value: "", label: "— Unassigned —" },
                ...buses.map((b) => ({ value: b.id, label: `${b.busNumber} (${b.plateNumber}) — ${b.status}` }))
              ]}
            />
          </FormField>
          <FormField label="Status">
            <SelectField value={form.status} onChange={(e) => set("status", e.target.value as any)}
              options={[{ value: "ACTIVE", label: "Active" }, { value: "ARCHIVED", label: "Archived" }]} />
          </FormField>
          <div className="sm:col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitLabel={editStudent ? "Save Changes" : "Add Student"} />
          </div>
        </form>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Bulk Import Students" size="lg">
        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1 font-semibold text-slate-800 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>Import Instructions:</span>
            </div>
            <p>Upload a <strong>CSV file</strong> or paste comma-separated values below. Required header fields: <code>Full Name</code>, <code>Parent Name</code>, <code>Parent Phone</code>, <code>Pickup Point</code>.</p>
            <p>Optional columns: <code>Student ID</code>, <code>Shift</code>, <code>Assigned Bus</code>, <code>Academic Year</code>, <code>Status</code>.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Choose CSV File</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-slate-400" />
                    <p className="mb-2 text-xs text-slate-500 font-semibold">Click to upload or drag & drop</p>
                    <p className="text-2xs text-slate-400">CSV or TXT file only</p>
                  </div>
                  <input type="file" accept=".csv, .txt" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Or Paste CSV Data Directly</label>
              <textarea
                value={importText}
                onChange={handleTextareaChange}
                placeholder="Student ID,Full Name,Shift,Parent Name,Parent Phone,Pickup Point,Assigned Bus,Status,Academic Year&#10;STU-501,Muna Ahmed,Morning,Ahmed Farah,+252 61 555 9000,Hodan,BUS-101,Active,2025-2026"
                className="w-full h-32 rounded-lg border border-slate-300 p-2 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <span className="text-sm font-semibold text-slate-700">Preview ({parsedData.length} records parsed)</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Overwrite/Update existing records with matching ID or Name</span>
                </label>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase key-header sticky top-0">
                    <tr>
                      <th className="p-2 border-b text-left">Status</th>
                      <th className="p-2 border-b text-left">ID</th>
                      <th className="p-2 border-b text-left">Full Name</th>
                      <th className="p-2 border-b text-left">Shift</th>
                      <th className="p-2 border-b text-left">Parent Name</th>
                      <th className="p-2 border-b text-left">Phone</th>
                      <th className="p-2 border-b text-left">Bus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((item, idx) => {
                      const isDupId = item.id && students.some(s => s.studentId === item.id);
                      const isDupName = item.fullName && students.some(s => s.fullName.toLowerCase() === item.fullName?.toLowerCase());
                      const isDup = isDupId || isDupName;

                      return (
                        <tr key={idx} className={`border-b hover:bg-slate-50 ${isDup ? 'bg-amber-50/40' : ''}`}>
                          <td className="p-2">
                            {isDup ? (
                              <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                                <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-600" /> Duplicate
                              </Badge>
                            ) : (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                                <CheckCircle className="h-3 w-3 inline mr-1 text-emerald-600" /> Ready
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 font-mono font-medium">{item.id || "—"}</td>
                          <td className="p-2 font-semibold text-slate-800">{item.fullName}</td>
                          <td className="p-2">{item.shift}</td>
                          <td className="p-2">{item.parentName}</td>
                          <td className="p-2">{item.parentPhone}</td>
                          <td className="p-2">{item.bus || "— Unassigned —"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={() => { setImportOpen(false); setParsedData([]); setImportText(""); }}
              className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={parsedData.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Import All Records
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
