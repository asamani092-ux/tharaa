import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie'; // بديل للجلسات
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

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (user.status === "suspended") {
    return c.json({ error: "Account suspended" }, 403);
  }

  // في Workers لا نستخدم req.session
  // نستخدم الكوكيز المشفرة (Cookies) لحفظ معرف المستخدم
  setCookie(c, 'userId', user.id, {
    httpOnly: true,
    secure: true,
    maxAge: 7 * 24 * 60 * 60, // أسبوع
    sameSite: 'Lax',
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
  deleteCookie(c, 'userId');
  return c.json({ message: "Logged out" });
});

// الحصول على بياناتي (Me)
router.get("/me", async (c) => {
  // جلب المعرف من الكوكيز
  const userId = c.req.cookie('userId');
  
  if (!userId) {
    return c.json({ authenticated: false });
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    deleteCookie(c, 'userId');
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
