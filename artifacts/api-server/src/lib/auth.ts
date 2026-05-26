import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

/**
 * التحقق من تسجيل الدخول (للمستخدمين العاديين)
 */
export async function requireAuth(c: Context, next: Next) {
  const userId = getCookie(c, 'userId');

  if (!userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  
  // تمرير الطلب للمرحلة التالية
  await next();
}

/** مشرف أو سوبرفايزر (إعدادات، إلخ) */
export async function requireStaff(c: Context, next: Next) {
  const userId = getCookie(c, "userId");
  const userRole = getCookie(c, "userRole");

  if (!userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  if (userRole !== "admin" && userRole !== "supervisor") {
    return c.json({ error: "Staff access required" }, 403);
  }

  await next();
}

/** مشرف تشغيلي فقط (بدون صلاحيات السوبرفايزر الحصرية) */
export async function requireAdmin(c: Context, next: Next) {
  const userId = getCookie(c, "userId");
  const userRole = getCookie(c, "userRole");

  if (!userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  if (userRole !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
}

/** صلاحية سوبرفايزر فقط */
export async function requireSupervisor(c: Context, next: Next) {
  const userId = getCookie(c, "userId");
  const userRole = getCookie(c, "userRole");

  if (!userId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  if (userRole !== "supervisor") {
    return c.json({ error: "Supervisor access required" }, 403);
  }

  await next();
}

/**
 * معالجة وتوحيد صيغة أرقام الجوال السعودية
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  
  let p = phone.trim().replace(/\s+/g, "");
  
  if (p.startsWith("+966")) {
    p = "0" + p.slice(4);
  } else if (p.startsWith("966") && p.length === 12) {
    p = "0" + p.slice(3);
  }
  
  if (!p.startsWith("0") && p.length === 9) {
    p = "0" + p;
  }
  
  return p;
}
