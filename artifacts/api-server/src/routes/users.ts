import { Hono } from 'hono';
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireStaff, normalizePhone } from "../lib/auth";

const router = new Hono();

router.get("/", requireStaff, async (c) => {
  const batchId = c.req.query('batchId');
  const status = c.req.query('status');

  const users = await db.select().from(usersTable)
    .where(and(
      eq(usersTable.role, "student"),
      batchId && batchId !== "null" ? eq(usersTable.batchId, parseInt(batchId)) : undefined,
      status && status !== "null" ? eq(usersTable.status, status) : undefined
    )).orderBy(usersTable.createdAt);

  return c.json(users.map(({passwordHash, ...u}) => u));
});

router.post("/", requireStaff, async (c) => {
  try {
    const body = await c.req.json();
    const normalizedPhone = normalizePhone(body.phone);

    const [user] = await db.insert(usersTable).values({
      ...body,
      phone: normalizedPhone,
      passwordHash: body.password.trim(), 
      role: "student",
      status: body.status || "active",
    }).returning();

    const { passwordHash, ...userWithoutPassword } = user;
    return c.json(userWithoutPassword, 201);
  } catch (error) {
    return c.json({ error: "حدث خطأ أثناء إضافة المشارك" }, 500);
  }
});

// المسار السري الذي كانت الواجهة تبحث عنه! (Bulk Insert)
router.post("/bulk", requireStaff, async (c) => {
  try {
    const body = await c.req.json();
    const { batchId, phaseNumber, levelType, rawText } = body;
    
    if (!rawText) return c.json({ error: "لا توجد بيانات" }, 400);

    const lines = rawText.split('\n').filter((l: string) => l.trim() !== '');
    let created = 0, failed = 0;

    for (const line of lines) {
      // تفترض الواجهة: الاسم رقم_الجوال كلمة_المرور
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
         const name = parts[0];
         const phone = normalizePhone(parts[1]);
         const password = parts[2];
         
         try {
             await db.insert(usersTable).values({
                name, phone, passwordHash: password,
                batchId, phaseNumber, levelType, role: "student"
             });
             created++;
         } catch(e) { failed++; }
      } else {
         failed++;
      }
    }
    
    return c.json({ created, failed, users: [] }, 201);
  } catch (error) {
    return c.json({ error: "خطأ في الاستيراد" }, 500);
  }
});

// تعديل بيانات مستخدم (دعم PUT و PATCH)
router.put("/:id", requireStaff, async (c) => {
   const id = parseInt(c.req.param('id'));
   const body = await c.req.json();
   const [user] = await db.update(usersTable).set(body).where(eq(usersTable.id, id)).returning();
   return c.json(user);
});
router.patch("/:id", requireStaff, async (c) => {
   const id = parseInt(c.req.param('id'));
   const body = await c.req.json();
   const [user] = await db.update(usersTable).set(body).where(eq(usersTable.id, id)).returning();
   return c.json(user);
});

router.delete("/:id", requireStaff, async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  return c.body(null, 204);
});

export default router;
