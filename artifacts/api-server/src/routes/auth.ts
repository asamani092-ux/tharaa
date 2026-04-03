import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'; // أضفنا getCookie
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { normalizePhone } from "../lib/auth";

const router = new Hono();

// تسجيل الدخول
router.post("/login", async (c) => {
  const { phone, password } = await c.req.json();
  
  if (!phone || !password) {
    return c.json({ error: "Phone and password are required" }, 400);
  }

  const normalized = normalizePhone(phone);
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, normalized));

  console.log('--- Debug Login ---');
console.log('Normalized Phone:', normalized);
console.log('User found:', !!user);
console.log('DB Password Hash Value:', user?.password_hash || user?.passwordHash || 'Not Found');

// استبدل سطر التحقق القديم بهذا السطر الذكي
const storedHash = user.passwordHash || (user as any).password_hash;

if (!user || !storedHash || !(await bcrypt.compare(password, storedHash))) {
  console.log('Login failed for:', normalized, 'Hash found:', !!storedHash);
  return c.json({ error: "Invalid credentials" }, 401);
}

  if (user.status === "suspended") {
    return c.json({ error: "Account suspended" }, 403);
  }

  // حفظ المعرف والدور في الكوكيز
  // ملاحظة: الكوكيز تقبل نصوص فقط، لذا حولنا ID لنص
  setCookie(c, 'userId', String(user.id), {
    httpOnly: true,
    secure: true,
    maxAge: 7 * 24 * 60 * 60,
    sameSite: 'Lax',
    path: '/', // مهم جداً لكي يظهر الكوكي في كل المسارات
  });

  setCookie(c, 'userRole', user.role, {
    httpOnly: true,
    secure: true,
    maxAge: 7 * 24 * 60 * 60,
    sameSite: 'Lax',
    path: '/',
  });

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
    role: user.role,
  });
});

// تسجيل الخروج
router.post("/logout", (c) => {
  deleteCookie(c, 'userId', { path: '/' });
  deleteCookie(c, 'userRole', { path: '/' });
  return c.json({ message: "Logged out" });
});

// الحصول على بياناتي (Me)
router.get("/me", async (c) => {
  // التصحيح: استخدام getCookie بدلاً من c.req.cookie
  const userId = getCookie(c, 'userId');
  
  if (!userId) {
    return c.json({ authenticated: false });
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parseInt(userId, 10))); // حولناه لرقم ليتطابق مع النوع في DB

  if (!user) {
    deleteCookie(c, 'userId', { path: '/' });
    return c.json({ authenticated: false });
  }

  return c.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });
});

export default router;
