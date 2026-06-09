"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

type DriverStudent = {
  id: string;
  studentId: string;
  fullName: string;
  parentName: string;
  parentPhone: string;
  attendanceStatus: string;
  paymentStatus: string;
};

type MyBusResponse = {
  busNumber: string | null;
  students: DriverStudent[];
};

export default function MyStudentsPage() {
  const [busNumber, setBusNumber] = useState<string | null>(null);
  const [students, setStudents] = useState<DriverStudent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<MyBusResponse>("/students/my-bus");
      setBusNumber(data.busNumber);
      setStudents(data.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assigned students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const filtered = students.filter((s) =>
    [s.studentId, s.fullName, s.parentName, s.parentPhone, s.attendanceStatus, s.paymentStatus]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Students</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {busNumber ? `Students assigned to your bus — ${busNumber}` : "Manage students assigned to your bus."}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadStudents()} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {students.length} students assigned
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {loading ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading assigned students...</div>
          ) : !busNumber ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-amber-800">No bus assigned to your driver profile.</p>
              <p className="mt-1 text-xs text-amber-600">Contact an administrator to assign you to a bus.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <DataTable
                rows={filtered.map((s) => ({
                  "Student ID": s.studentId,
                  "Student Name": s.fullName,
                  "Parent Name": s.parentName,
                  "Parent Phone": s.parentPhone,
                  "Attendance Status": s.attendanceStatus,
                  "Payment Status": s.paymentStatus
                }))}
              />

              {/* Payment status legend */}
              <div className="mt-4 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5" /> Paid
                </span>
                <span className="flex items-center gap-1 font-semibold text-rose-700">
                  <XCircle className="h-3.5 w-3.5" /> Unpaid
                </span>
                <span className="text-slate-400 italic">Payment amounts and financial details are hidden.</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
