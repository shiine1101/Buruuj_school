"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, DollarSign, Percent, Plus, RefreshCw, Search, UserCheck, UserX, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Dialog, FormField, FormActions, SelectField } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ACADEMIC_YEARS = Array.from({ length: 2045 - 2009 }, (_, i) => {
  const start = 2009 + i;
  const val = `${start}-${start + 1}`;
  return { value: val, label: val };
}).reverse();

type PaymentStatus = "PAID" | "UNPAID" | "PARTIAL";

type BackendStudent = {
  id: string;
  studentId: string;
  fullName: string;
  status: "ACTIVE" | "ARCHIVED";
  academicYear: string;
  bus?: { busNumber: string } | null;
};

type BackendPayment = {
  id: string;
  studentId: string;
  academicYear: string;
  month: number;
  amount: string | number;
  status: PaymentStatus;
  notes: string | null;
  student: BackendStudent;
};

type PaymentForm = {
  studentId: string;
  month: string;
  academicYear: string;
  amount: string;
  status: PaymentStatus;
  notes: string;
};

const EMPTY: PaymentForm = { studentId: "", month: "1", academicYear: "2025-2026", amount: "120", status: "UNPAID", notes: "" };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<BackendPayment[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"matrix" | "list">("matrix");
  const [selectedYear, setSelectedYear] = useState("2025-2026");
  const [editPayment, setEditPayment] = useState<BackendPayment | null>(null);
  const [form, setForm] = useState<PaymentForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [paymentData, studentData] = await Promise.all([
        apiFetch<BackendPayment[]>("/payments"),
        apiFetch<BackendStudent[]>("/students")
      ]);
      setPayments(paymentData);
      setStudents(studentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeStudents = useMemo(() => students.filter((student) => student.status === "ACTIVE"), [students]);
  const yearPayments = payments.filter((payment) => payment.academicYear === selectedYear);
  const filteredPayments = yearPayments.filter((payment) =>
    [payment.student.fullName, payment.student.studentId, MONTHS[payment.month - 1], payment.academicYear, payment.status, payment.notes ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const filteredStudents = activeStudents.filter((student) =>
    search === "" || [student.fullName, student.studentId, student.bus?.busNumber ?? ""].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const total = yearPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const paid = yearPayments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const partial = yearPayments.filter((payment) => payment.status === "PARTIAL").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const unpaid = yearPayments.filter((payment) => payment.status === "UNPAID").reduce((sum, payment) => sum + Number(payment.amount), 0);
  const paidStudentIds = new Set(yearPayments.filter((payment) => payment.status === "PAID").map((payment) => payment.studentId));
  const unpaidStudentIds = new Set(activeStudents.filter((student) => !paidStudentIds.has(student.id)).map((student) => student.id));
  const collectionRate = total > 0 ? Math.round((paid / total) * 100) : 0;

  function openAdd() {
    setForm({ ...EMPTY, academicYear: selectedYear });
    setEditPayment(null);
    setOpen(true);
  }

  function openEditPayment(payment: BackendPayment) {
    setEditPayment(payment);
    setForm({
      studentId: payment.studentId,
      month: String(payment.month),
      academicYear: payment.academicYear,
      amount: String(payment.amount),
      status: payment.status,
      notes: payment.notes ?? ""
    });
    setOpen(true);
  }

  function handleCellClick(student: BackendStudent, monthNumber: number) {
    const payment = payments.find((item) => item.studentId === student.id && item.academicYear === selectedYear && item.month === monthNumber);
    if (payment) {
      openEditPayment(payment);
    } else {
      setEditPayment(null);
      setForm({
        studentId: student.id,
        month: String(monthNumber),
        academicYear: selectedYear,
        amount: "120",
        status: "UNPAID",
        notes: ""
      });
      setOpen(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      studentId: form.studentId,
      academicYear: form.academicYear,
      month: Number(form.month),
      amount: Number(form.amount),
      status: form.status,
      notes: form.notes || undefined
    };

    try {
      if (editPayment) {
        await apiFetch(`/payments/${editPayment.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/payments", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payment.");
    }
  }

  function exportCSV() {
    const rows = view === "list"
      ? filteredPayments.map((payment) => ({
          student: payment.student.fullName,
          month: MONTHS[payment.month - 1],
          academicYear: payment.academicYear,
          amount: payment.amount,
          status: payment.status,
          notes: payment.notes ?? ""
        }))
      : filteredStudents.map((student) => ({
          student: student.fullName,
          academicYear: selectedYear,
          ...Object.fromEntries(MONTHS.map((month, index) => [
            month,
            payments.find((payment) => payment.studentId === student.id && payment.academicYear === selectedYear && payment.month === index + 1)?.status ?? "UNPAID"
          ]))
        }));

    if (!rows.length) return alert("No data to export.");
    const headers = Object.keys(rows[0]).join(",");
    const csvRows = rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${csvRows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${view}-${selectedYear}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function set(field: keyof PaymentForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <AppShell>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Students", value: activeStudents.length, icon: Users, tone: "blue" },
          { label: "Paid Students", value: paidStudentIds.size, icon: UserCheck, tone: "green" },
          { label: "Unpaid Students", value: unpaidStudentIds.size, icon: UserX, tone: "red" },
          { label: "Collection Rate", value: `${collectionRate}%`, icon: Percent, tone: "orange" },
          { label: "Monthly Revenue", value: `$${paid.toLocaleString()}`, icon: DollarSign, tone: "blue" }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{card.value}</p>
                </div>
                <div className={`grid h-11 w-11 place-items-center rounded-md ${summaryTone(card.tone)}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4 border-b bg-white dark:border-slate-800 dark:bg-slate-900">
          <div>
            <CardTitle>Payments</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Database-backed monthly payment status for registered students.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border bg-slate-50 p-1 dark:bg-slate-950">
              <button type="button" onClick={() => setView("matrix")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === "matrix" ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900" : "text-slate-500"}`}>
                Monthly Matrix
              </button>
              <button type="button" onClick={() => setView("list")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === "list" ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900" : "text-slate-500"}`}>
                Payments Log
              </button>
            </div>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-900">
              {ACADEMIC_YEARS.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}
            </select>
            <button onClick={openAdd} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Add Payment
            </button>
            <button onClick={() => loadData()} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Paid: ${paid.toLocaleString()}</Badge>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">Partial: ${partial.toLocaleString()}</Badge>
              <Badge className="border-rose-200 bg-rose-50 text-rose-700">Unpaid: ${unpaid.toLocaleString()}</Badge>
            </div>
          </div>

          {loading ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-slate-500">Loading payments...</div>
          ) : view === "list" ? (
            <DataTable
              rows={filteredPayments.map((payment) => ({
                id: payment.id,
                student: payment.student.fullName,
                month: MONTHS[payment.month - 1],
                academicYear: payment.academicYear,
                amount: `$${Number(payment.amount).toLocaleString()}`,
                status: payment.status,
                notes: payment.notes ?? ""
              }))}
              onEdit={(index) => openEditPayment(filteredPayments[index])}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm dark:bg-slate-900">
              <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-20 bg-slate-50 text-2xs font-extrabold uppercase text-slate-500 dark:bg-slate-900">
                  <tr className="border-b">
                    <th className="sticky left-0 z-30 border-r bg-slate-50 px-4 py-3 text-left dark:bg-slate-900">Student Name</th>
                    {MONTHS.map((month) => <th key={month} className="px-3 py-3 text-center">{month.slice(0, 3)}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan={13} className="px-4 py-8 text-center font-semibold text-slate-400">No students found.</td></tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50">
                        <td className="sticky left-0 z-10 border-r bg-white px-4 py-3 font-extrabold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {student.fullName}
                        </td>
                        {MONTHS.map((month, index) => {
                          const payment = payments.find((item) => item.studentId === student.id && item.academicYear === selectedYear && item.month === index + 1);
                          const status = payment?.status ?? "UNPAID";
                          return (
                            <td key={month} onClick={() => handleCellClick(student, index + 1)} className="cursor-pointer px-3 py-3 text-center hover:bg-slate-100">
                              <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase ${statusClass(status)}`}>
                                {status}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editPayment ? "Edit Payment" : "Add Payment"}>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <FormField label="Student" required>
            <SelectField
              value={form.studentId}
              onChange={(e) => set("studentId", e.target.value)}
              options={[
                { value: "", label: "Select Student" },
                ...activeStudents.map((student) => ({
                  value: student.id,
                  label: `${student.fullName} (${student.studentId}) - Bus: ${student.bus?.busNumber ?? "Unassigned"}`
                }))
              ]}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Month" required>
              <SelectField value={form.month} onChange={(e) => set("month", e.target.value)} options={MONTHS.map((month, index) => ({ value: String(index + 1), label: month }))} />
            </FormField>
            <FormField label="Academic Year" required>
              <SelectField value={form.academicYear} onChange={(e) => set("academicYear", e.target.value)} options={ACADEMIC_YEARS} />
            </FormField>
          </div>
          <FormField label="Amount" required>
            <Input type="number" min="0" step="any" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
          </FormField>
          <FormField label="Status" required>
            <SelectField
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              options={[
                { value: "PAID", label: "PAID" },
                { value: "UNPAID", label: "UNPAID" },
                { value: "PARTIAL", label: "PARTIAL" }
              ]}
            />
          </FormField>
          <FormField label="Notes">
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes" />
          </FormField>
          <FormActions onCancel={() => setOpen(false)} submitLabel={editPayment ? "Save Changes" : "Add Payment"} />
        </form>
      </Dialog>
    </AppShell>
  );
}

function summaryTone(tone: string) {
  if (tone === "green") return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30";
  if (tone === "orange") return "bg-amber-50 text-amber-600 dark:bg-amber-950/30";
  if (tone === "red") return "bg-rose-50 text-rose-600 dark:bg-rose-950/30";
  return "bg-blue-50 text-blue-600 dark:bg-blue-950/30";
}

function statusClass(status: PaymentStatus) {
  if (status === "PAID") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "PARTIAL") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-rose-100 bg-rose-50 text-rose-700";
}
