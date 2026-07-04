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

/** مشرف تشغيلي أو سوبرفايزر (نفس أدوات اللوحة؛ السوبرفايزر يضيف إدارة المشرفين وإعدادات حصرية) */
export function canAccessAdminTools(role?: string | null): boolean {
  return isStaffRole(role);
}

export function homePathForRole(role?: string | null): string {
  if (isStaffRole(role)) return "/admin";
  return "/student";
}
