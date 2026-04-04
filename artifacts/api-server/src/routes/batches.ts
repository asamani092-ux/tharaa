import { Hono } from 'hono';
import { eq } from "drizzle-orm";
import { db, batchesTable } from "@workspace/db";
import { requireAdmin, requireAuth } from "../lib/auth";

const router = new Hono();

// جلب كل الدفعات
router.get("/", requireAuth, async (c) => {
  const batches = await db.select().from(batchesTable).orderBy(batchesTable.createdAt);
  return c.json(batches);
});

// مسار إضافي لتوافق الواجهة الأمامية (لتجنب 404 في جلب الدفعات)
router.get("/all", requireAuth, async (c) => {
  const batches = await db.select().from(batchesTable).orderBy(batchesTable.createdAt);
  return c.json(batches);
});

// إضافة دفعة جديدة (هذا هو المسار الذي كان يعطي 404)
router.post("/", requireAdmin, async (c) => {
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
router.patch("/:id", requireAdmin, async (c) => {
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
router.delete("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(batchesTable).where(eq(batchesTable.id, id));
  return c.body(null, 204);
});

export default router;
