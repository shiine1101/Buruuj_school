"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, Home, RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";

type AttendanceRecord = {
  id: string;
  date: string;
  pickedUp: boolean;
  droppedHome: boolean;
  student: {
    id: string;
    studentId: string;
    fullName: string;
    pickupPoint?: string;
    bus?: { busNumber: string } | null;
  };
  recorder?: { fullName: string } | null;
};

type DriverStudent = {
  id: string;
  studentId: string;
  fullName: string;
  parentName: string;
  parentPhone: string;
  pickupPoint: string;
  pickedUp: boolean;
  droppedHome: boolean;
  paymentStatus: string;
};

type BackendStudent = {
  id: string;
  studentId: string;
  fullName: string;
  pickupPoint: string;
  status: "ACTIVE" | "ARCHIVED";
  bus?: { busNumber: string } | null;
};

type MyBusResponse = {
  busNumber: string | null;
  students: DriverStudent[];
};

const today = () => new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const { role } = useAppStore();
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [driverBus, setDriverBus] = useState<string | null>(null);
  const [driverStudents, setDriverStudents] = useState<DriverStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (role === "DRIVER") {
        const data = await apiFetch<MyBusResponse>("/students/my-bus");
        setDriverBus(data.busNumber);
        setDriverStudents(data.students);
        setRecords([]);
      } else {
        const [attendanceData, studentData] = await Promise.all([
          apiFetch<AttendanceRecord[]>("/attendance"),
          apiFetch<BackendStudent[]>("/students")
        ]);
        setRecords(attendanceData);
        setStudents(studentData);
        setDriverStudents([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function markStudent(student: DriverStudent, next: { pickedUp: boolean; droppedHome: boolean }) {
    setError("");
    try {
      await apiFetch("/attendance", {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          date: today(),
          pickedUp: next.pickedUp,
          droppedHome: next.droppedHome
        })
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark attendance.");
    }
  }

  const filteredDriverStudents = useMemo(
    () =>
      driverStudents.filter((student) =>
        [student.studentId, student.fullName, student.parentName, student.parentPhone, student.pickupPoint]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [driverStudents, search]
  );

  const filteredRecords = useMemo(
    () =>
      students.filter((student) =>
        [
          student.studentId,
          student.fullName,
          student.bus?.busNumber ?? "",
          records.find((record) => record.student.id === student.id)?.recorder?.fullName ?? "",
          records.find((record) => record.student.id === student.id)?.pickedUp ? "picked up" : "pending",
          records.find((record) => record.student.id === student.id)?.droppedHome ? "dropped home" : ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [records, search, students]
  );

  const pickedUpCount = role === "DRIVER" ? driverStudents.filter((s) => s.pickedUp).length : records.filter((r) => r.pickedUp).length;
  const droppedHomeCount = role === "DRIVER" ? driverStudents.filter((s) => s.droppedHome).length : records.filter((r) => r.droppedHome).length;
  const totalCount = role === "DRIVER" ? driverStudents.length : students.filter((student) => student.status === "ACTIVE").length;

  return (
    <AppShell>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {[
          { label: role === "DRIVER" ? "My Students" : "Total Records", value: totalCount, cls: "bg-blue-50 text-blue-700" },
          { label: "Picked Up", value: pickedUpCount, cls: "bg-emerald-50 text-emerald-700" },
          { label: "Dropped Home", value: droppedHomeCount, cls: "bg-violet-50 text-violet-700" }
        ].map((card) => (
          <div key={card.label} className={`rounded-lg border p-5 font-bold ${card.cls}`}>
            <p className="text-sm">{card.label}</p>
            <p className="mt-1 text-3xl">{card.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Attendance</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {role === "DRIVER" && driverBus ? `Mark pickup and drop-home for students assigned to ${driverBus}.` : "Review attendance history from the database."}
            </p>
          </div>
          <button onClick={() => loadData()} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <div className="mb-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search attendance..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading attendance...</div>
          ) : role === "DRIVER" ? (
            !driverBus ? (
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-6 py-12 text-center text-sm font-semibold text-amber-800">
                No bus assigned to your driver profile.
              </div>
            ) : filteredDriverStudents.length === 0 ? (
              <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">No assigned students found.</div>
            ) : (
              <div className="space-y-3">
                {filteredDriverStudents.map((student) => (
                  <div key={student.id} className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{student.fullName}</p>
                      <p className="text-xs text-slate-500">{student.studentId} - {student.pickupPoint}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge className={student.pickedUp ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                          {student.pickedUp ? "Picked Up" : "Pending Pickup"}
                        </Badge>
                        <Badge className={student.droppedHome ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                          {student.droppedHome ? "Dropped Home" : "Not Dropped"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => markStudent(student, { pickedUp: true, droppedHome: student.droppedHome })}
                        disabled={student.pickedUp}
                        className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" /> Mark Picked Up
                      </button>
                      <button
                        onClick={() => markStudent(student, { pickedUp: true, droppedHome: true })}
                        disabled={student.droppedHome}
                        className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Home className="h-4 w-4" /> Mark Dropped Home
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <DataTable
              rows={filteredRecords
                .filter((student) => student.status === "ACTIVE")
                .map((student) => {
                  const record = records.find((item) => item.student.id === student.id);
                  return {
                    id: record?.id ?? student.id,
                    date: record ? new Date(record.date).toLocaleDateString() : today(),
                    studentId: student.studentId,
                    studentName: student.fullName,
                    bus: student.bus?.busNumber ?? "Unassigned",
                    pickedUp: record?.pickedUp ? "Allowed" : "Blocked",
                    droppedHome: record?.droppedHome ? "Allowed" : "Blocked",
                    recordedBy: record?.recorder?.fullName ?? "Not marked"
                  };
                })}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
