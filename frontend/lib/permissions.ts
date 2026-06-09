export type Role = "ADMIN" | "FINANCIAL_OFFICER" | "DRIVER";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  FINANCIAL_OFFICER: "Financial Officer",
  DRIVER: "Driver",
};

export const roleLabelsSo: Record<Role, string> = {
  ADMIN: "Maamule",
  FINANCIAL_OFFICER: "Sarkaalka Maaliyadda",
  DRIVER: "Darawal",
};

export const permissions: Record<Role, string[]> = {
  ADMIN: ["dashboard", "students", "drivers", "buses", "maintenance", "payments", "attendance", "reports", "ai-assistant", "settings", "live-tracking", "notifications", "users"],
  FINANCIAL_OFFICER: ["dashboard", "payments", "maintenance", "reports", "notifications"],
  DRIVER: ["dashboard", "my-students", "attendance", "my-bus", "live-tracking", "maintenance", "notifications"],
};

export function canAccess(role: Role, section: string) {
  return permissions[role]?.includes(section) || false;
}

export const NAV_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "Dashboard": "Dashboard",
    "Students": "Students",
    "My Students": "My Students",
    "My Children": "My Children",
    "Drivers": "Drivers",
    "Buses": "Buses",
    "My Bus": "My Bus",
    "Maintenance": "Maintenance",
    "Payments": "Payments",
    "Attendance": "Attendance",
    "Reports": "Reports",
    "AI Assistant": "AI Assistant",
    "Settings": "Settings",
    "Notifications": "Notifications",
    "Live Tracking": "Live Tracking",
    "Users": "Users",
    "Log Out": "Log Out"
  },
  so: {
    "Dashboard": "Kormeerka",
    "Students": "Ardayda",
    "My Students": "Ardaydayda",
    "My Children": "Carruurteyda",
    "Drivers": "Darawallada",
    "Buses": "Basaska",
    "My Bus": "Baskeyga",
    "Maintenance": "Dayactirka",
    "Payments": "Lacag bixinta",
    "Attendance": "Joogitaanka",
    "Reports": "Warbixinnada",
    "AI Assistant": "Caawiyaha AI",
    "Settings": "Habeeyaha",
    "Notifications": "Ogeysiisyada",
    "Live Tracking": "Raadraaca Tooska ah",
    "Users": "Isticmaalayaasha",
    "Log Out": "Ka Bax"
  }
};
