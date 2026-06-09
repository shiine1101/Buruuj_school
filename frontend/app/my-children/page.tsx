"use client";

import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { Bus, MapPin, Clock } from "lucide-react";

export default function MyChildrenPage() {
  const { students, attendance, payments } = useAppStore();

  // Parent sees first student
  const myChild = students[0];
  const childAttendance = attendance.filter(a => a.student === myChild?.fullName);
  const childPayments = payments.filter(p => p.student === myChild?.fullName);

  if (!myChild) {
    return (
      <AppShell>
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-slate-500">No children registered.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Child Card */}
      <div className="mb-6 rounded-xl border bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl">👦</div>
          <div>
            <h2 className="text-2xl font-black">{myChild.fullName}</h2>
            <p className="text-blue-100">ID: {myChild.id} • {myChild.shift} Shift</p>
            <p className="mt-1 text-blue-100">Academic Year: {myChild.academicYear}</p>
          </div>
          <Badge className={`ml-auto ${myChild.status === "Active" ? "bg-emerald-400 text-emerald-900" : "bg-rose-400 text-rose-900"}`}>
            {myChild.status}
          </Badge>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white/10 p-3">
            <Bus className="h-5 w-5 mb-1" />
            <p className="text-xs text-blue-200">Assigned Bus</p>
            <p className="font-bold">{myChild.bus || "—"}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <MapPin className="h-5 w-5 mb-1" />
            <p className="text-xs text-blue-200">Pickup Point</p>
            <p className="font-bold">{myChild.pickupPoint}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <Clock className="h-5 w-5 mb-1" />
            <p className="text-xs text-blue-200">Shift</p>
            <p className="font-bold">{myChild.shift}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable rows={childAttendance.map(({ date, pickedUp, droppedHome, recordedBy }) => ({ date, pickedUp, droppedHome, recordedBy }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable rows={childPayments.map(({ month, academicYear, amount, status, notes }) => ({ month, academicYear, amount, status, notes }))} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
