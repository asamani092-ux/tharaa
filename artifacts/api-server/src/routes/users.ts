import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and } from "drizzle-orm";
import { db, usersTable, batchesTable } from "@workspace/db";
import { requireAdmin, requireAuth, normalizePhone } from "../lib/auth";

const router = new Hono();

// ==========================================
// قسم المشاركين (Users)
// ==========================================

// جلب المستخدمين (موجود مسبقاً)
router.get("/", requireAdmin, async (c) => {
  const batchId = c.req.query('batchId');
  const status = c.req.query('status');

  const users = await db.select().from(usersTable)
    .where(and(
      eq(usersTable.role, "student"),
      batchId ? eq(usersTable.batchId, parseInt(batchId)) : undefined,
      status ? eq(usersTable.status, status) : undefined
    )).orderBy(usersTable.createdAt);

  return c.json(users.map(({passwordHash, ...u}) => u));
});

// إضافة مشارك جديد (الكود الناقص الذي يسبب المشكلة)
router.post("/", requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const { name, phone, password, batchId, status, phaseNumber, levelType } = body;

    if (!name || !phone || !password) {
      return c.json({ error: "الاسم، رقم الجوال، وكلمة المرور مطلوبة" }, 400);
    }

    const normalizedPhone = normalizePhone(phone);

    // التحقق من عدم وجود الرقم مسبقاً
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.phone, normalizedPhone));
    if (existingUser.length > 0) {
      return c.json({ error: "رقم الجوال مسجل مسبقاً" }, 400);
    }

    // إضافة المشارك (نص صريح كما اتفقنا سابقاً لتسهيل العمل)
    const [user] = await db.insert(usersTable).values({
      name,
      phone: normalizedPhone,
      passwordHash: password.trim(), // حفظ مباشر بدون تشفير حالياً
      role: "student",
      batchId: batchId || null,
      status: status || "active",
      phaseNumber: phaseNumber || 1,
      levelType: levelType || "basic",
    }).returning();

    const { passwordHash, ...userWithoutPassword } = user;
    return c.json(userWithoutPassword, 201);
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ error: "حدث خطأ أثناء إضافة المشارك" }, 500);
  }
});

// حذف مستخدم (موجود مسبقاً)
router.delete("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  return c.body(null, 204);
});


// ==========================================
// قسم الدفعات (Batches)
// ==========================================

// جلب كل الدفعات (موجود مسبقاً)
router.get("/batches/all", requireAuth, async (c) => {
  const batches = await db.select().from(batchesTable).orderBy(batchesTable.createdAt);
  return c.json(batches);
});

// إضافة دفعة جديدة (الكود الناقص الذي يسبب 404)
router.post("/batches", requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ error: "اسم الدفعة مطلوب" }, 400);
    }

    const [batch] = await db.insert(batchesTable).values({
      name: body.name
    }).returning();

    return c.json(batch, 201);
  } catch (error) {
    console.error("Error creating batch:", error);
    return c.json({ error: "حدث خطأ أثناء إنشاء الدفعة" }, 500);
  }
});

// تعديل دفعة
router.patch("/batches/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  
  const [batch] = await db.update(batchesTable)
    .set({ name: body.name })
    .where(eq(batchesTable.id, id))
    .returning();

  if (!batch) return c.json({ error: "الدفعة غير موجودة" }, 404);
  return c.json(batch);
});

// حذف دفعة
router.delete("/batches/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(batchesTable).where(eq(batchesTable.id, id));
  return c.body(null, 204);
});

export default router;
