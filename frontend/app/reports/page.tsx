"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Download, FileSpreadsheet, FileText, Filter, RefreshCw, Sheet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api-client";

type ReportType = "payments" | "attendance" | "maintenance" | "notifications";

type PaymentRecord = {
  id: string;
  academicYear: string;
  month: number;
  amount: string | number;
  status: string;
  notes: string | null;
  student: { studentId: string; fullName: string; bus?: { busNumber: string } | null };
};

type AttendanceRecord = {
  id: string;
  date: string;
  pickedUp: boolean;
  droppedHome: boolean;
  student: { studentId: string; fullName: string; bus?: { busNumber: string } | null };
  recorder?: { fullName: string } | null;
};

type FuelRecord = {
  id: string;
  date: string;
  liters: string | number;
  cost?: string | number;
  notes: string | null;
  bus?: { busNumber: string } | null;
};

type BreakdownRecord = {
  id: string;
  date: string;
  problem: string;
  description: string;
  repairCost?: string | number | null;
  status: string;
  bus?: { busNumber: string } | null;
};

type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  channel: string;
  event: string;
  sentTo: string | null;
  createdAt: string;
};

const ACADEMIC_YEARS = Array.from({ length: 2045 - 2009 }, (_, i) => {
  const start = 2009 + i;
  return `${start}-${start + 1}`;
}).reverse();
const MONTHS = ["All", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function ReportsPage() {
  const [active, setActive] = useState<ReportType>("payments");
  const [year, setYear] = useState("2025-2026");
  const [month, setMonth] = useState("All");
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [fuel, setFuel] = useState<FuelRecord[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [paymentData, attendanceData, fuelData, breakdownData, notificationData] = await Promise.all([
        apiFetch<PaymentRecord[]>("/payments"),
        apiFetch<AttendanceRecord[]>("/attendance"),
        apiFetch<FuelRecord[]>("/maintenance/fuel"),
        apiFetch<BreakdownRecord[]>("/maintenance/breakdowns"),
        apiFetch<NotificationRecord[]>("/notifications?limit=100")
      ]);
      setPayments(paymentData);
      setAttendance(attendanceData);
      setFuel(fuelData);
      setBreakdowns(breakdownData);
      setNotifications(notificationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const reports = [
    { id: "payments" as ReportType, label: "Payment Report", icon: FileSpreadsheet, color: "text-emerald-600" },
    { id: "attendance" as ReportType, label: "Attendance Report", icon: Sheet, color: "text-blue-600" },
    { id: "maintenance" as ReportType, label: "Maintenance Report", icon: FileText, color: "text-orange-600" },
    { id: "notifications" as ReportType, label: "Notification History", icon: FileText, color: "text-violet-600" }
  ];

  const currentRows = useMemo(() => {
    if (active === "payments") {
      return payments
        .filter((payment) => payment.academicYear === year && (month === "All" || payment.month === MONTHS.indexOf(month)))
        .map((payment) => ({
          studentId: payment.student.studentId,
          student: payment.student.fullName,
          bus: payment.student.bus?.busNumber ?? "Unassigned",
          month: MONTHS[payment.month],
          academicYear: payment.academicYear,
          amount: `$${Number(payment.amount).toLocaleString()}`,
          status: payment.status,
          notes: payment.notes ?? ""
        }));
    }

    if (active === "attendance") {
      return attendance.map((record) => ({
        date: new Date(record.date).toLocaleDateString(),
        studentId: record.student.studentId,
        student: record.student.fullName,
        bus: record.student.bus?.busNumber ?? "Unassigned",
        pickedUp: record.pickedUp ? "Allowed" : "Blocked",
        droppedHome: record.droppedHome ? "Allowed" : "Blocked",
        recordedBy: record.recorder?.fullName ?? "System"
      }));
    }

    if (active === "maintenance") {
      return [
        ...fuel.map((record) => ({
          type: "Fuel",
          date: new Date(record.date).toLocaleDateString(),
          bus: record.bus?.busNumber ?? "Unassigned",
          liters: record.liters,
          cost: record.cost !== undefined ? `$${Number(record.cost).toLocaleString()}` : "",
          status: "Recorded",
          description: record.notes ?? ""
        })),
        ...breakdowns.map((record) => ({
          type: record.problem.startsWith("Repair") ? "Repair" : "Breakdown",
          date: new Date(record.date).toLocaleDateString(),
          bus: record.bus?.busNumber ?? "Unassigned",
          problem: record.problem,
          cost: record.repairCost ? `$${Number(record.repairCost).toLocaleString()}` : "",
          status: record.status,
          description: record.description
        }))
      ];
    }

    return notifications.map((notification) => ({
      title: notification.title,
      body: notification.body,
      channel: notification.channel,
      event: notification.event,
      sentTo: notification.sentTo ?? "All",
      createdAt: new Date(notification.createdAt).toLocaleString()
    }));
  }, [active, attendance, breakdowns, fuel, month, notifications, payments, year]);

  function exportCSV() {
    if (!currentRows.length) return alert("No data to export.");
    const headers = Object.keys(currentRows[0]).join(",");
    const rows = currentRows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active}-report-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setActive(report.id)}
              className={`rounded-lg border p-4 text-left transition-all ${active === report.id ? "border-blue-500 bg-blue-50 shadow-sm" : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"}`}
            >
              <Icon className={`mb-2 h-6 w-6 ${report.color}`} />
              <p className="text-sm font-bold">{report.label}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{reports.find((report) => report.id === active)?.label}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{currentRows.length} database records found</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {active === "payments" && (
              <>
                <div className="flex items-center gap-1.5 rounded-md border px-3 py-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-transparent text-sm font-semibold outline-none">
                    {ACADEMIC_YEARS.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent text-sm font-semibold outline-none">
                    {MONTHS.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
              </>
            )}
            <button onClick={() => loadReports()} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading reports...</div>
          ) : (
            <DataTable rows={currentRows as Record<string, string | number>[]} />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
