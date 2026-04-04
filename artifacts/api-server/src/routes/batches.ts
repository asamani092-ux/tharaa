import { Hono } from 'hono';
import { eq } from "drizzle-orm";
import { db, batchesTable, usersTable, readingLogsTable } from "@workspace/db";
import { requireAdmin, requireAuth } from "../lib/auth";

const router = new Hono();

router.get("/", requireAuth, async (c) => {
  const batches = await db.select().from(batchesTable).orderBy(batchesTable.createdAt);
  return c.json(batches);
});

router.post("/", requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name) return c.json({ error: "اسم الدفعة مطلوب" }, 400);

    const [batch] = await db.insert(batchesTable).values({ name: body.name }).returning();
    return c.json(batch, 201);
  } catch (error) {
    return c.json({ error: "حدث خطأ أثناء إنشاء الدفعة" }, 500);
  }
});

// تم التغيير من PATCH إلى PUT بناءً على طلب الواجهة
router.put("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  
  const [batch] = await db.update(batchesTable)
    .set({ name: body.name })
    .where(eq(batchesTable.id, id))
    .returning();

  if (!batch) return c.json({ error: "الدفعة غير موجودة" }, 404);
  return c.json(batch);
});

router.delete("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'));
  
  // يفضل حذف السجلات والمستخدمين التابعين للدفعة قبل حذفها
  const usersInBatch = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.batchId, id));
  const userIds = usersInBatch.map(u => u.id);
  
  if (userIds.length > 0) {
     // في حال أردت تفعيل الحذف المتسلسل (Cascade)
     // await db.delete(readingLogsTable).where(inArray(readingLogsTable.userId, userIds));
     // await db.delete(usersTable).where(eq(usersTable.batchId, id));
  }
  
  await db.delete(batchesTable).where(eq(batchesTable.id, id));
  return c.body(null, 204);
});

export default router;
