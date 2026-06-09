"use client";

import { useCallback, useEffect, useState } from "react";
import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import {
  AlertTriangle,
  Bus as BusIcon,
  CalendarCheck,
  DollarSign,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";

const pieColors = ["#16a34a", "#f97316", "#dc2626"];

type DriverDashboardData = {
  bus: {
    id: string;
    busNumber: string;
    plateNumber: string;
    capacity: number;
    status: string;
  } | null;
  assignedStudentCount: number;
  attendanceSummary: {
    pickedUp: number;
    droppedHome: number;
    pending: number;
  };
  routeStatus: "ACTIVE" | "NOT_STARTED" | "NO_BUS";
  students: Array<{
    id: string;
    studentId: string;
    fullName: string;
    pickupPoint: string;
    pickedUp: boolean;
    droppedHome: boolean;
    paymentStatus: "PAID" | "UNPAID" | "PARTIAL";
  }>;
  maintenanceRequests: Array<{
    id: string;
    type: string;
    problem: string;
    description: string;
    status: string;
    date: string;
  }>;
};

export default function DashboardPage() {
  const { role, students, drivers, buses, attendance, payments, maintenance, notifications } = useAppStore();

  const activeStudents = students.filter((student) => student.status === "Active");
  const activeDrivers = drivers.filter((driver) => driver.status === "Active");
  const activeBuses = buses.filter((bus) => bus.status === "Active");
  const maintenanceBuses = buses.filter((bus) => bus.status === "Maintenance" || bus.status === "OutOfService");
  const paidAmount = payments
    .filter((payment) => payment.status.toLowerCase() === "paid")
    .reduce((sum, payment) => sum + Number(String(payment.amount).replace(/[^0-9.]/g, "")), 0);
  const overdueAmount = payments
    .filter((payment) => ["unpaid", "overdue"].includes(payment.status.toLowerCase()))
    .reduce((sum, payment) => sum + Number(String(payment.amount).replace(/[^0-9.]/g, "")), 0);
  const pendingPaymentAmount = payments
    .filter((payment) => ["partial", "pending"].includes(payment.status.toLowerCase()))
    .reduce((sum, payment) => sum + Number(String(payment.amount).replace(/[^0-9.]/g, "")), 0);
  const todayDateStr = "May 19, 2025";
  const todayAttendanceRecords = attendance.filter((item) => item.date === todayDateStr);
  const pickedUp = todayAttendanceRecords.filter((item) => item.pickedUp === "Allowed").length;
  const blocked = todayAttendanceRecords.filter((item) => item.pickedUp === "Blocked").length;
  const pending = Math.max(0, activeStudents.length - todayAttendanceRecords.length);
  const recentActivities = notifications.slice(0, 5);
  const isDriver = role === "DRIVER";
  const isFinance = role === "FINANCIAL_OFFICER";

  if (isDriver) {
    return <DriverDashboard />;
  }

  const statsList = [
        { label: "Total Students", value: activeStudents.length, sub: "active enrollment", icon: Users, tone: "blue" },
        ...(!isFinance ? [{ label: "Total Drivers", value: activeDrivers.length, sub: "active drivers", icon: ShieldCheck, tone: "green" }] : []),
        { label: "Total Buses", value: buses.length, sub: `${activeBuses.length} active`, icon: BusIcon, tone: "orange" },
        { label: "Monthly Revenue", value: `$${paidAmount.toLocaleString()}`, sub: `$${overdueAmount.toLocaleString()} overdue`, icon: DollarSign, tone: "green" },
        { label: "Attendance Rate", value: `${activeStudents.length ? Math.round((pickedUp / activeStudents.length) * 100) : 0}%`, sub: "today", icon: TrendingUp, tone: "blue" }
      ];

  return (
    <AppShell>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statsList.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ${toneClass(item.tone)}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold uppercase text-slate-500">{item.label}</p>
                  <p className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
                  <p className="truncate text-xs font-semibold text-slate-400">{item.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b dark:border-slate-800">
            <div>
              <CardTitle className="text-base">Operations Snapshot</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Route coverage, bus status, and attendance in one view.</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_0.9fr]">
            <div className="min-h-[280px] rounded-lg border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Live Tracking</p>
                    <p className="text-xs text-slate-500">{activeBuses.length} buses active</p>
                  </div>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Online</Badge>
                </div>
                <div className="relative my-6 h-36 overflow-hidden rounded-lg bg-white dark:bg-slate-900">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:28px_28px]" />
                  <div className="absolute left-8 top-24 h-1 w-52 rotate-[-18deg] rounded-full bg-blue-500" />
                  <div className="absolute left-36 top-20 h-1 w-32 rotate-[22deg] rounded-full bg-emerald-500" />
                  {activeBuses.slice(0, 3).map((bus, index) => (
                    <div
                      key={bus.busNumber}
                      className="absolute grid h-9 w-9 place-items-center rounded-md bg-blue-600 text-white shadow-lg"
                      style={{ left: `${24 + index * 28}%`, top: `${56 - index * 16}%` }}
                    >
                      <BusIcon className="h-4 w-4" />
                    </div>
                  ))}
                  <div className="absolute bottom-5 left-8 flex items-center gap-2 rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow dark:bg-slate-900 dark:text-slate-200">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    Route network
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Metric label="Active" value={activeBuses.length} />
                  <Metric label="Maintenance" value={maintenanceBuses.length} />
                  <Metric label="Alerts" value={maintenance.length} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Attendance Distribution</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Present", value: pickedUp || 1 },
                        { name: "Pending", value: pending },
                        { name: "Blocked", value: blocked }
                      ]}
                      innerRadius={54}
                      outerRadius={76}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieColors.map((color) => <Cell key={color} fill={color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2 text-xs font-semibold">
                <Legend color="bg-emerald-500" label="Present" value={pickedUp} />
                <Legend color="bg-orange-500" label="Pending" value={pending} />
                <Legend color="bg-red-600" label="Blocked" value={blocked} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b dark:border-slate-800">
            <div>
              <CardTitle className="text-base">Payments Overview</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Collection health for the current period.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <PaymentRow label="Paid" value={paidAmount} total={paidAmount + pendingPaymentAmount + overdueAmount} color="bg-emerald-500" />
            <PaymentRow label="Pending" value={pendingPaymentAmount} total={paidAmount + pendingPaymentAmount + overdueAmount} color="bg-orange-500" />
            <PaymentRow label="Overdue" value={overdueAmount} total={paidAmount + pendingPaymentAmount + overdueAmount} color="bg-red-500" />
            <div className="rounded-lg border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-500">Total collected</p>
              <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">${paidAmount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b dark:border-slate-800">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivities.length === 0 ? (
              <p className="p-6 text-sm font-medium text-slate-500">No recent activities reported.</p>
            ) : (
              <div className="divide-y dark:divide-slate-800">
                {recentActivities.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-5 py-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="truncate text-xs text-slate-500">{item.body}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b dark:border-slate-800">
            <CardTitle className="text-base">Maintenance Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {maintenance.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm font-medium text-slate-500">No maintenance alerts.</p>
            ) : (
              maintenance.map((item, index) => (
                <div key={`${item.bus}-${index}`} className="flex items-center gap-3 rounded-lg border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/30">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.bus}</p>
                    <p className="truncate text-xs text-slate-500">{item.description}</p>
                  </div>
                  <Badge className={item.status === "Completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                    {item.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function DriverDashboard() {
  const [data, setData] = useState<DriverDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dashboard = await apiFetch<DriverDashboardData>("/drivers/dashboard");
      setData(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load driver dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const bus = data?.bus;
  const attendance = data?.attendanceSummary ?? { pickedUp: 0, droppedHome: 0, pending: 0 };

  return (
    <AppShell>
      {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="mb-4 flex justify-end">
        <button onClick={() => loadDashboard()} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading assigned bus data...</div>
      ) : !bus ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <p className="mt-3 font-bold text-slate-900 dark:text-white">No bus assigned</p>
            <p className="mt-1 text-sm text-slate-500">Your dashboard will populate after an admin assigns a bus to your driver profile.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Bus Number", value: bus.busNumber, sub: bus.status, icon: BusIcon, tone: "blue" },
              { label: "Plate Number", value: bus.plateNumber, sub: "assigned bus", icon: ShieldCheck, tone: "green" },
              { label: "Capacity", value: bus.capacity, sub: "seats", icon: Users, tone: "orange" },
              { label: "Assigned Students", value: data.assignedStudentCount, sub: "active students", icon: Users, tone: "blue" },
              { label: "Route Status", value: data.routeStatus === "ACTIVE" ? "Active" : "Not Started", sub: "live tracking", icon: MapPin, tone: data.routeStatus === "ACTIVE" ? "green" : "red" }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ${toneClass(item.tone)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold uppercase text-slate-500">{item.label}</p>
                      <p className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
                      <p className="truncate text-xs font-semibold text-slate-400">{item.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <Card>
              <CardHeader className="border-b dark:border-slate-800">
                <CardTitle className="text-base">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-5 sm:grid-cols-3 lg:grid-cols-1">
                <Metric label="Picked Up" value={attendance.pickedUp} />
                <Metric label="Dropped Home" value={attendance.droppedHome} />
                <Metric label="Pending" value={attendance.pending} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b dark:border-slate-800">
                <CardTitle className="text-base">My Students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {data.students.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm font-medium text-slate-500">No students assigned to this bus.</p>
                ) : (
                  data.students.slice(0, 8).map((student) => (
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
          </div>

          <Card className="mt-4">
            <CardHeader className="border-b dark:border-slate-800">
              <CardTitle className="text-base">Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              {data.maintenanceRequests.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm font-medium text-slate-500">No maintenance requests for your bus.</p>
              ) : (
                data.maintenanceRequests.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3 dark:border-slate-800">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-600">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.type}</p>
                      <p className="truncate text-xs text-slate-500">{item.description}</p>
                    </div>
                    <Badge className={item.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}

function paymentStatusClass(status: string) {
  if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PARTIAL") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function toneClass(tone: string) {
  if (tone === "green") return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30";
  if (tone === "orange") return "bg-orange-50 text-orange-600 dark:bg-orange-950/30";
  if (tone === "red") return "bg-red-50 text-red-600 dark:bg-red-950/30";
  return "bg-blue-50 text-blue-600 dark:bg-blue-950/30";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
      <p className="text-lg font-black text-slate-950 dark:text-white">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-black text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function PaymentRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="font-black text-slate-950 dark:text-white">${value.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
