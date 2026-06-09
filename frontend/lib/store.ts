"use client";

import { create } from "zustand";
import type { Role } from "@/lib/permissions";
import {
  students as initialStudents,
  drivers as initialDrivers,
  buses as initialBuses,
  payments as initialPayments,
  attendance as initialAttendance,
  maintenance as initialMaintenance,
  notifications as initialNotifications
} from "@/lib/mock-data";

export type Student = {
  id: string;
  fullName: string;
  shift: string;
  parentName: string;
  parentPhone: string;
  pickupPoint: string;
  bus: string;
  status: string;
  academicYear: string;
};

export type Driver = {
  fullName: string;
  phone: string;
  licenseNumber: string;
  bus: string;
  status: string;
};

export type Bus = {
  busNumber: string;
  plateNumber: string;
  capacity: number;
  driver: string;
  status: string;
};

export type Payment = {
  student: string;
  month: string;
  academicYear: string;
  amount: string;
  status: string;
  notes: string;
};

export type Attendance = {
  student: string;
  date: string;
  pickedUp: string;
  droppedHome: string;
  recordedBy: string;
};

export type Maintenance = {
  type: string;
  bus: string;
  cost: string;
  description: string;
  status: string;
  date?: string;
  odometer?: string;
  fuelQuantity?: string;
  fuelType?: string;
  receiptNumber?: string;
  notes?: string;
  category?: string;
  severity?: string;
  location?: string;
  estimatedCost?: string;
  repairCategory?: string;
  workshopName?: string;
  technician?: string;
};

export type Notification = {
  title: string;
  body: string;
  time: string;
  tone: string;
};

type AppState = {
  role: Role;
  language: "en" | "so";
  setRole: (role: Role) => void;
  setLanguage: (language: "en" | "so") => void;

  // Students
  students: Student[];
  addStudent: (s: Student) => void;
  updateStudent: (index: number, s: Student) => void;
  deleteStudent: (index: number) => void;
  bulkAddStudents: (studentsList: Student[], overwrite: boolean) => void;

  // Drivers
  drivers: Driver[];
  addDriver: (d: Driver) => void;
  updateDriver: (index: number, d: Driver) => void;
  deleteDriver: (index: number) => void;

  // Buses
  buses: Bus[];
  addBus: (b: Bus) => void;
  updateBus: (index: number, b: Bus) => void;
  deleteBus: (index: number) => void;

  // Payments
  payments: Payment[];
  addPayment: (p: Payment) => void;
  updatePayment: (index: number, p: Payment) => void;
  deletePayment: (index: number) => void;

  // Attendance
  attendance: Attendance[];
  addAttendance: (a: Attendance) => void;
  updateAttendance: (index: number, a: Attendance) => void;
  deleteAttendance: (index: number) => void;

  // Maintenance
  maintenance: Maintenance[];
  addMaintenance: (m: Maintenance) => void;
  updateMaintenance: (index: number, m: Maintenance) => void;
  deleteMaintenance: (index: number) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  deleteNotification: (index: number) => void;
};

const getInitialRole = (): Role => {
  if (typeof window === "undefined") return "ADMIN";
  try {
    const token = sessionStorage.getItem("buruuj_access_token") ?? localStorage.getItem("buruuj_access_token");
    if (!token) return "ADMIN";
    const [, payload] = token.split(".");
    if (!payload) return "ADMIN";
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const session = JSON.parse(atob(padded));
    if (session?.exp && session.exp * 1000 <= Date.now()) return "ADMIN";
    if (session && session.role) return session.role as Role;
  } catch {}
  return "ADMIN";
};

export const useAppStore = create<AppState>((set) => ({
  role: getInitialRole(),
  language: "en",
  setRole: (role) => set({ role }),
  setLanguage: (language) => set({ language }),

  // Students
  students: initialStudents,
  addStudent: (s) =>
    set((state) => {
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const newPayments: Payment[] = months.map(m => ({
        student: s.fullName,
        month: m,
        academicYear: s.academicYear,
        amount: "$120",
        status: "Unpaid",
        notes: "Automatically generated on registration"
      }));
      // Automatically create an attendance record for today if student is active
      const hasTodayRecord = state.attendance.some(a => a.student === s.fullName && a.date === "May 19, 2025");
      const newAttendance: Attendance[] = [];
      if (s.status === "Active" && !hasTodayRecord) {
        newAttendance.push({
          student: s.fullName,
          date: "May 19, 2025",
          pickedUp: "Allowed",
          droppedHome: "Allowed",
          recordedBy: "Auto-System"
        });
      }
      return {
        students: [...state.students, s],
        payments: [...state.payments, ...newPayments],
        attendance: [...state.attendance, ...newAttendance]
      };
    }),
  updateStudent: (index, s) =>
    set((state) => {
      const oldStudent = state.students[index];
      const updated = [...state.students];
      updated[index] = s;
      
      // Update student payments name if changed
      const updatedPayments = state.payments.map(p => {
        if (p.student === oldStudent.fullName) {
          return { ...p, student: s.fullName };
        }
        return p;
      });

      // Update student attendance records if name changed
      const updatedAttendance = state.attendance.map(a => {
        if (a.student === oldStudent.fullName) {
          return { ...a, student: s.fullName };
        }
        return a;
      });

      // Automatically handle attendance inclusion if status changed from Archived to Active
      const hasTodayRecord = updatedAttendance.some(a => a.student === s.fullName && a.date === "May 19, 2025");
      if (s.status === "Active" && !hasTodayRecord) {
        updatedAttendance.push({
          student: s.fullName,
          date: "May 19, 2025",
          pickedUp: "Allowed",
          droppedHome: "Allowed",
          recordedBy: "Auto-System"
        });
      }

      return { 
        students: updated,
        payments: updatedPayments,
        attendance: updatedAttendance
      };
    }),
  deleteStudent: (index) =>
    set((state) => {
      const student = state.students[index];
      if (!student) return state;
      const updated = [...state.students];
      updated[index] = { ...student, status: "Archived" };
      return { students: updated };
    }),
  bulkAddStudents: (studentsList, overwrite) =>
    set((state) => {
      const existing = [...state.students];
      const newPayments = [...state.payments];
      const newAttendance = [...state.attendance];
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      studentsList.forEach((newStu) => {
        const idx = existing.findIndex(
          (s) => s.id === newStu.id || s.fullName.toLowerCase() === newStu.fullName.toLowerCase()
        );
        if (idx > -1) {
          if (overwrite) {
            const oldName = existing[idx].fullName;
            existing[idx] = { ...existing[idx], ...newStu };
            // Update name matches
            newPayments.forEach(p => { if (p.student === oldName) p.student = newStu.fullName; });
            newAttendance.forEach(a => { if (a.student === oldName) a.student = newStu.fullName; });
          }
        } else {
          existing.push(newStu);
          months.forEach((m) => {
            newPayments.push({
              student: newStu.fullName,
              month: m,
              academicYear: newStu.academicYear,
              amount: "$120",
              status: "Unpaid",
              notes: "Automatically generated on registration"
            });
          });
          // Auto attendance
          if (newStu.status === "Active" && !newAttendance.some(a => a.student === newStu.fullName && a.date === "May 19, 2025")) {
            newAttendance.push({
              student: newStu.fullName,
              date: "May 19, 2025",
              pickedUp: "Allowed",
              droppedHome: "Allowed",
              recordedBy: "Auto-System"
            });
          }
        }
      });
      return { students: existing, payments: newPayments, attendance: newAttendance };
    }),

  // Drivers
  drivers: initialDrivers,
  addDriver: (d) =>
    set((state) => {
      const newDrivers = [...state.drivers, d];
      const newBuses = state.buses.map((b) => {
        // If bus matches the newly assigned bus, update its driver
        if (d.bus !== "Unassigned" && d.bus !== "" && b.busNumber === d.bus) {
          return { ...b, driver: d.fullName };
        }
        // If bus was previously assigned to this driver (if they had a bus before), it is now unassigned
        return b;
      });

      // Clear bus field for any other driver that was assigned to this bus
      const finalDrivers = newDrivers.map((drv) => {
        if (drv.fullName !== d.fullName && d.bus !== "Unassigned" && d.bus !== "" && drv.bus === d.bus) {
          return { ...drv, bus: "Unassigned" };
        }
        return drv;
      });

      return { drivers: finalDrivers, buses: newBuses };
    }),
  updateDriver: (index, d) =>
    set((state) => {
      const oldDriver = state.drivers[index];
      const newDrivers = [...state.drivers];
      newDrivers[index] = d;

      // Update buses
      const newBuses = state.buses.map((b) => {
        // Unassign old bus if it changed
        if (oldDriver.bus !== "Unassigned" && oldDriver.bus !== "" && oldDriver.bus !== d.bus && b.busNumber === oldDriver.bus) {
          return { ...b, driver: "Unassigned" };
        }
        // Assign new bus
        if (d.bus !== "Unassigned" && d.bus !== "" && b.busNumber === d.bus) {
          return { ...b, driver: d.fullName };
        }
        return b;
      });

      // Clean up other drivers assigned to the new bus
      const finalDrivers = newDrivers.map((drv) => {
        if (drv.fullName !== d.fullName && d.bus !== "Unassigned" && d.bus !== "" && drv.bus === d.bus) {
          return { ...drv, bus: "Unassigned" };
        }
        return drv;
      });

      return { drivers: finalDrivers, buses: newBuses };
    }),
  deleteDriver: (index) =>
    set((state) => {
      const driver = state.drivers[index];
      if (!driver) return state;
      const updated = [...state.drivers];
      updated[index] = { ...driver, status: "Archived" };
      return { drivers: updated };
    }),

  // Buses
  buses: initialBuses,
  addBus: (b) =>
    set((state) => {
      const newBuses = [...state.buses, b];
      const newDrivers = state.drivers.map((d) => {
        if (b.driver !== "Unassigned" && b.driver !== "" && d.fullName === b.driver) {
          return { ...d, bus: b.busNumber };
        }
        return d;
      });

      // Clear driver field for any other bus assigned to this driver
      const finalBuses = newBuses.map((bus) => {
        if (bus.busNumber !== b.busNumber && b.driver !== "Unassigned" && b.driver !== "" && bus.driver === b.driver) {
          return { ...bus, driver: "Unassigned" };
        }
        return bus;
      });

      return { buses: finalBuses, drivers: newDrivers };
    }),
  updateBus: (index, b) =>
    set((state) => {
      const oldBus = state.buses[index];
      const newBuses = [...state.buses];
      newBuses[index] = b;

      // Update drivers
      const newDrivers = state.drivers.map((d) => {
        // Unassign old driver if it changed
        if (oldBus.driver !== "Unassigned" && oldBus.driver !== "" && oldBus.driver !== b.driver && d.fullName === oldBus.driver) {
          return { ...d, bus: "Unassigned" };
        }
        // Assign new driver
        if (b.driver !== "Unassigned" && b.driver !== "" && d.fullName === b.driver) {
          return { ...d, bus: b.busNumber };
        }
        return d;
      });

      // Clean up other buses assigned to the new driver
      const finalBuses = newBuses.map((bus) => {
        if (bus.busNumber !== b.busNumber && b.driver !== "Unassigned" && b.driver !== "" && bus.driver === b.driver) {
          return { ...bus, driver: "Unassigned" };
        }
        return bus;
      });

      return { buses: finalBuses, drivers: newDrivers };
    }),
  deleteBus: (index) =>
    set((state) => {
      const bus = state.buses[index];
      if (!bus) return state;
      const updated = [...state.buses];
      updated[index] = { ...bus, status: "Archived" };
      return { buses: updated };
    }),

  // Payments
  payments: initialPayments,
  addPayment: (p) => set((state) => ({ payments: [...state.payments, p] })),
  updatePayment: (index, p) =>
    set((state) => {
      const updated = [...state.payments];
      updated[index] = p;
      return { payments: updated };
    }),
  deletePayment: (index) =>
    set((state) => ({ payments: state.payments.filter((_, i) => i !== index) })),

  // Attendance
  attendance: initialAttendance,
  addAttendance: (a) => set((state) => ({ attendance: [...state.attendance, a] })),
  updateAttendance: (index, a) =>
    set((state) => {
      const updated = [...state.attendance];
      updated[index] = a;
      return { attendance: updated };
    }),
  deleteAttendance: (index) =>
    set((state) => ({ attendance: state.attendance.filter((_, i) => i !== index) })),

  // Maintenance
  maintenance: initialMaintenance,
  addMaintenance: (m) => set((state) => ({ maintenance: [...state.maintenance, m] })),
  updateMaintenance: (index, m) =>
    set((state) => {
      const updated = [...state.maintenance];
      updated[index] = m;
      return { maintenance: updated };
    }),
  deleteMaintenance: (index) =>
    set((state) => ({ maintenance: state.maintenance.filter((_, i) => i !== index) })),

  // Notifications
  notifications: initialNotifications,
  addNotification: (n) => set((state) => ({ notifications: [...state.notifications, n] })),
  deleteNotification: (index) =>
    set((state) => ({ notifications: state.notifications.filter((_, i) => i !== index) })),
}));
