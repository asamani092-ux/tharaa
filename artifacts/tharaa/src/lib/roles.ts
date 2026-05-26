export type AppRole = "student" | "admin" | "supervisor";

export function isStaffRole(role?: string | null): role is "admin" | "supervisor" {
  return role === "admin" || role === "supervisor";
}

export function isAdminRole(role?: string | null): role is "admin" {
  return role === "admin";
}

export function isSupervisorRole(role?: string | null): boolean {
  return role === "supervisor";
}

/** مسارات يراها السوبرفايزر فقط (بدون مشاركين أو إحصائيات تشغيلية) */
export const SUPERVISOR_NAV_PATHS = ["/admin/settings", "/admin/supervisors"] as const;

export function isSupervisorOnlyPath(path: string): boolean {
  return SUPERVISOR_NAV_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

export function homePathForRole(role?: string | null): string {
  if (role === "supervisor") return "/admin/supervisors";
  if (isAdminRole(role)) return "/admin";
  return "/student";
}
