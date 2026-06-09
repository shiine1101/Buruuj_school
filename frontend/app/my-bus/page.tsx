"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bus, CheckCircle, MapPin, RefreshCw, Users, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";

type DriverStudent = {
  id: string;
  studentId: string;
  fullName: string;
  pickupPoint: string;
  pickedUp: boolean;
  droppedHome: boolean;
  paymentStatus: "PAID" | "UNPAID" | "PARTIAL";
};

type MyBusResponse = {
  bus: {
    id: string;
    busNumber: string;
    plateNumber: string;
    capacity: number;
    status: string;
  } | null;
  students: DriverStudent[];
};

export default function MyBusPage() {
  const [data, setData] = useState<MyBusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<MyBusResponse>("/students/my-bus");
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assigned bus.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBus();
  }, [loadBus]);

  const bus = data?.bus ?? null;
  const students = data?.students ?? [];

  return (
    <AppShell>
      <div className="mb-4 flex justify-end">
        <button onClick={() => loadBus()} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading assigned bus...</div>
      ) : !bus ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <p className="mt-3 font-bold text-slate-900 dark:text-white">No bus assigned</p>
            <p className="mt-1 text-sm text-slate-500">Contact an administrator to assign your driver profile to a bus.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 rounded-lg border bg-slate-900 p-6 text-white shadow-lg">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-lg bg-yellow-400 text-slate-950">
                  <Bus className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">{bus.busNumber}</h2>
                  <p className="text-sm text-slate-300">Plate: {bus.plateNumber}</p>
                </div>
              </div>
              <Badge className="w-fit border-emerald-300 bg-emerald-500/15 text-emerald-100">{bus.status}</Badge>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Metric icon={Users} label="Capacity" value={`${bus.capacity} seats`} />
              <Metric icon={MapPin} label="Assigned Students" value={`${students.length} active`} />
              <Metric icon={CheckCircle} label="Picked Up Today" value={`${students.filter((s) => s.pickedUp).length}`} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader className="border-b dark:border-slate-800">
                <CardTitle className="text-base">Bus Student List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {students.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm font-medium text-slate-500">No students assigned to this bus.</p>
                ) : (
                  students.map((student) => (
                    <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 dark:border-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{student.fullName}</p>
                        <p className="text-xs text-slate-500">{student.studentId} - {student.pickupPoint}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={student.pickedUp ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                          {student.droppedHome ? "Dropped Home" : student.pickedUp ? "Picked Up" : "Pending"}
                        </Badge>
                        <Badge className={paymentStatusClass(student.paymentStatus)}>{student.paymentStatus}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-5 w-5 text-amber-600" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-5">
                <Link href="/attendance" className="rounded-md border px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  Mark Attendance
                </Link>
                <Link href="/my-students" className="rounded-md border px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  View My Students
                </Link>
                <Link href="/maintenance" className="rounded-md border px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  Maintenance
                </Link>
                <Link href="/live-tracking" className="rounded-md border px-4 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  Live Tracking
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-4">
      <Icon className="mb-1 h-5 w-5 text-blue-300" />
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function paymentStatusClass(status: string) {
  if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PARTIAL") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}
