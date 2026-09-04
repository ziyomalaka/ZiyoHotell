export const ROLES = {
  SOFTWARE_ADMIN: "SYSTEM_ADMIN",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  RECEPTION: "RECEPTION",
  BOSHLIQ: "MANAGER",
  MANAGER: "MANAGER",
} as const;

export const ALL_PERMISSIONS = [
  { key: "rooms.manage", label: "Xonalar boshqaruvi" },
  { key: "staff.manage", label: "Xodimlar boshqaruvi" },
  { key: "customers.view", label: "Mijozlarni ko‘rish" },
  { key: "customers.create", label: "Mijoz yaratish" },
  { key: "payments.view", label: "To‘lovlarni ko‘rish" },
  { key: "payments.create", label: "To‘lov kiritish" },
  { key: "stays.manage", label: "Kirish / chiqish" },
  { key: "reports.view", label: "Hisobot" },
  { key: "reports.export", label: "Excel eksport" },
  { key: "roles.manage", label: "Rollar" },
  { key: "settings.manage", label: "Sozlamalar" },
  { key: "audit.view", label: "Audit log" },
  { key: "backup.manage", label: "Backup" },
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SYSTEM_ADMIN: ALL_PERMISSIONS.map((p) => p.key),
  SOFTWARE_ADMIN: ALL_PERMISSIONS.map((p) => p.key),
  RECEPTION: [
    "customers.view",
    "customers.create",
    "payments.view",
    "payments.create",
    "stays.manage",
    "reports.view",
    "reports.export",
  ],
  MANAGER: ["customers.view", "payments.view", "reports.view", "reports.export"],
  BOSHLIQ: ["customers.view", "payments.view", "reports.view", "reports.export"],
};

export function normalizeRole(role: string) {
  if (role === "SOFTWARE_ADMIN" || role === "SYSTEM_ADMIN") return ROLES.SYSTEM_ADMIN;
  if (role === "BOSHLIQ" || role === "MANAGER") return ROLES.MANAGER;
  return ROLES.RECEPTION;
}

export function homePath(role: string) {
  const r = normalizeRole(role);
  if (r === ROLES.SYSTEM_ADMIN) return "/admin/rooms";
  if (r === ROLES.MANAGER) return "/manager";
  return "/register";
}

export function parsePermissions(raw: string | null | undefined) {
  try {
    const list = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}
