import {
  Activity,
  BadgeDollarSign,
  Bell,
  Bus,
  CalendarCheck,
  Fuel,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wrench
} from "lucide-react";

export const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { label: "Students", href: "/students", icon: Users, permission: "students" },
  { label: "My Students", href: "/my-students", icon: Users, permission: "my-students" },
  { label: "Drivers", href: "/drivers", icon: ShieldCheck, permission: "drivers" },
  { label: "Buses", href: "/buses", icon: Bus, permission: "buses" },
  { label: "My Bus", href: "/my-bus", icon: Bus, permission: "my-bus" },
  { label: "Maintenance", href: "/maintenance", icon: Wrench, permission: "maintenance" },
  { label: "Payments", href: "/payments", icon: BadgeDollarSign, permission: "payments" },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck, permission: "attendance" },
  { label: "Live Tracking", href: "/live-tracking", icon: MapPin, permission: "live-tracking" },
  { label: "Reports", href: "/reports", icon: Activity, permission: "reports" },
  { label: "AI Assistant", href: "/ai-assistant", icon: MessageSquareText, permission: "ai-assistant" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings" },
  { label: "Users", href: "/users", icon: UserCog, permission: "users" },
  { label: "Notifications", href: "/notifications", icon: Bell, permission: "notifications" }
];


export const students = [
  { id: "STU-1001", fullName: "Hassan Mohamed", shift: "Morning", parentName: "Ahmed Ali", parentPhone: "+252 61 555 1200", pickupPoint: "Hodan", bus: "BUS-101", status: "Active", academicYear: "2025-2026" },
  { id: "STU-1002", fullName: "Amina Yusuf", shift: "Afternoon", parentName: "Maryan Noor", parentPhone: "+252 61 555 1288", pickupPoint: "Waberi", bus: "BUS-108", status: "Active", academicYear: "2025-2026" },
  { id: "STU-1003", fullName: "Abdi Rahman", shift: "Vocational", parentName: "Fadumo Omar", parentPhone: "+252 61 555 1780", pickupPoint: "Karaan", bus: "BUS-104", status: "Archived", academicYear: "2024-2025" }
];

export const drivers = [
  { fullName: "Mahad Ibrahim", phone: "+252 61 555 8800", licenseNumber: "DRV-90821", bus: "BUS-101", status: "Active" },
  { fullName: "Abshir Aden", phone: "+252 61 555 4412", licenseNumber: "DRV-88201", bus: "BUS-108", status: "Active" },
  { fullName: "Yasin Osman", phone: "+252 61 555 4500", licenseNumber: "DRV-74319", bus: "Unassigned", status: "Archived" }
];

export const buses = [
  { busNumber: "BUS-101", plateNumber: "MOG-7821", capacity: 54, driver: "Mahad Ibrahim", status: "Active" },
  { busNumber: "BUS-108", plateNumber: "MOG-1198", capacity: 48, driver: "Abshir Aden", status: "Maintenance" },
  { busNumber: "BUS-104", plateNumber: "MOG-3372", capacity: 42, driver: "Unassigned", status: "OutOfService" }
];

export const payments = [
  { student: "Hassan Mohamed", month: "May", academicYear: "2025-2026", amount: "$120", status: "Paid", notes: "Receipt emailed" },
  { student: "Amina Yusuf", month: "May", academicYear: "2025-2026", amount: "$120", status: "Unpaid", notes: "Reminder sent" },
  { student: "Abdi Rahman", month: "May", academicYear: "2025-2026", amount: "$60", status: "Partial", notes: "Balance due" }
];

export const attendance = [
  { student: "Hassan Mohamed", date: "May 19, 2025", pickedUp: "Allowed", droppedHome: "Allowed", recordedBy: "Mahad Ibrahim" },
  { student: "Amina Yusuf", date: "May 19, 2025", pickedUp: "Allowed", droppedHome: "Blocked", recordedBy: "Abshir Aden" },
  { student: "Abdi Rahman", date: "May 19, 2025", pickedUp: "Blocked", droppedHome: "Blocked", recordedBy: "Mahad Ibrahim" }
];

export const maintenance = [
  { type: "Fuel", bus: "BUS-101", cost: "$8,450", description: "Monthly fuel record", status: "Completed" },
  { type: "Breakdown", bus: "BUS-108", cost: "$3,250", description: "Engine problem", status: "InProgress" }
];

export const notifications = [
  { title: "Payment received from Ahmed Ali", body: "Grade 5 - $120", time: "10:30 AM", tone: "green" },
  { title: "Bus BUS-101 reported breakdown", body: "Engine problem", time: "09:15 AM", tone: "red" },
  { title: "Attendance marked for today", body: "All buses completed", time: "08:45 AM", tone: "blue" },
  { title: "New student registered", body: "Hassan Mohamed", time: "Yesterday", tone: "violet" }
];

export const reportTypes = ["Payment Reports", "Attendance Reports", "Maintenance Reports", "Notification History", "PDF Export", "Excel Export", "CSV Export"];
