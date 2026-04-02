import { Hono } from 'hono';
import { eq, and } from "drizzle-orm";
import { db, curriculumTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = new Hono();

// جلب الكتب (للمستخدمين المسجلين)
router.get("/", requireAuth, async (c) => {
  const phaseNumber = c.req.query('phaseNumber');
  const level = c.req.query('level');

  const books = await db
    .select()
    .from(curriculumTable)
    .where(
      phaseNumber && level
        ? and(eq(curriculumTable.phaseNumber, parseInt(phaseNumber)), eq(curriculumTable.levelType, level))
        : phaseNumber
        ? eq(curriculumTable.phaseNumber, parseInt(phaseNumber))
        : level
        ? eq(curriculumTable.levelType, level)
        : undefined
    )
    .orderBy(curriculumTable.phaseNumber, curriculumTable.orderInLevel);

  return c.json(books);
});

// إضافة كتاب جديد (للمدير فقط)
router.post("/", requireAdmin, async (c) => {
  const body = await c.req.json();
  const { phaseNumber, phaseName, levelType, bookCode, title, totalPages } = body;

  if (!phaseNumber || !phaseName || !levelType || !bookCode || !title || !totalPages) {
    return c.json({ error: "Required fields missing" }, 400);
  }

  const [book] = await db
    .insert(curriculumTable)
    .values({
      ...body,
      pdfUrl: body.pdfUrl ?? null,
      publisher: body.publisher ?? null,
      author: body.author ?? null,
      orderInLevel: body.orderInLevel ?? 1,
    })
    .returning();

  return c.json(book, 201);
});

// تحديث كامل لبيانات كتاب
router.put("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);

  const body = await c.req.json();
  const [book] = await db
    .update(curriculumTable)
    .set({ ...body })
    .where(eq(curriculumTable.id, id))
    .returning();

  if (!book) return c.json({ error: "Book not found" }, 404);
  return c.json(book);
});

// تحديث جزئي لبيانات كتاب
router.patch("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);

  const updates = await c.req.json();
  const [book] = await db
    .update(curriculumTable)
    .set(updates)
    .where(eq(curriculumTable.id, id))
    .returning();

  if (!book) return c.json({ error: "Book not found" }, 404);
  return c.json(book);
});

// حذف كتاب
router.delete("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);

  await db.delete(curriculumTable).where(eq(curriculumTable.id, id));
  return c.body(null, 204);
});

export default router;
