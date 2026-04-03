import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { normalizePhone } from "../lib/auth";

const router = new Hono();

// تسجيل الدخول (نص صريح بدون تشفير)
router.post("/login", async (c) => {
  // قراءة البيانات مرة واحدة فقط
  const body = await c.req.json();
  const rawPhone = body.phone;
  const rawPassword = body.password;
  
  if (!rawPhone || !rawPassword) {
    return c.json({ error: "Phone and password are required" }, 400);
  }

  const normalized = normalizePhone(rawPhone);
  const password = rawPassword.trim(); // تنظيف كلمة المرور

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, normalized));

  // جلب كلمة المرور من القاعدة (دعم كلا التسميتين)
  const storedPassword = user?.passwordHash || (user as any)?.password_hash;

  console.log('--- Debug Login (Plain Text) ---');
  console.log('Normalized Phone:', normalized);
  console.log('User found:', !!user);
  console.log('Stored Password:', storedPassword);
  console.log('Received Password:', password);

  // مقارنة مباشرة بالنص الصريح
  if (!user || password !== storedPassword) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (user.status === "suspended") {
    return c.json({ error: "Account suspended" }, 403);
  }

  // حفظ المعرف والدور في الكوكيز
setCookie(c, 'userId', String(user.id), {
  httpOnly: true,
  secure: true,   // يجب أن يكون true
  sameSite: 'None', // غيره من Lax إلى None (هذا هو السر!)
  maxAge: 7 * 24 * 60 * 60,
  path: '/',
});

setCookie(c, 'userRole', user.role, {
  httpOnly: true,
  secure: true,
  sameSite: 'None', // غيره من Lax إلى None
  maxAge: 7 * 24 * 60 * 60,
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
  const userId = getCookie(c, 'userId');
  if (!userId) return c.json({ authenticated: false });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parseInt(userId, 10)));

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
