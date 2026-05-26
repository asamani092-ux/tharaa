export type AppRole = "student" | "admin" | "supervisor";

export function isStaffRole(role?: string | null): role is "admin" | "supervisor" {
  return role === "admin" || role === "supervisor";
}

export function isSupervisorRole(role?: string | null): boolean {
  return role === "supervisor";
}

export function homePathForRole(role?: string | null): string {
  if (isStaffRole(role)) return "/admin";
  return "/student";
}
