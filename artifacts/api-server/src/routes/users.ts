import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import bcrypt from "bcryptjs";
import { eq, and, inArray } from "drizzle-orm";
import { db, usersTable, batchesTable, readingLogsTable } from "@workspace/db";
import { requireAdmin, requireAuth, normalizePhone } from "../lib/auth";

const router = new Hono();

// جلب المستخدمين
router.get("/", requireAdmin, async (c) => {
  const batchId = c.req.query('batchId');
  const status = c.req.query('status');

  const users = await db.select().from(usersTable)
    .where(and(
      eq(usersTable.role, "student"),
      batchId ? eq(usersTable.batchId, parseInt(batchId)) : undefined,
      status ? eq(usersTable.status, status) : undefined
    )).orderBy(usersTable.createdAt);

  return c.json(users.map(({passwordHash, ...u}) => u)); // استثناء الهاش للأمان
});

// حذف مستخدم
router.delete("/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  return c.body(null, 204);
});

// جلب الدفعات
router.get("/batches/all", requireAuth, async (c) => {
  const batches = await db.select().from(batchesTable).orderBy(batchesTable.createdAt);
  return c.json(batches);
});

export default router;
