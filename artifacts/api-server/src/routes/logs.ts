import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and } from "drizzle-orm";
import { db, readingLogsTable, curriculumTable, systemSettingsTable, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = new Hono();

// دالة مساعدة لحالة التسليم
function getSubmissionStatus(settings: any): string {
  if (settings.allDaysActive) return "on_time";
  const now = new Date();
  const day = now.getDay();
  const startDay = settings.submissionStartDay;
  const lateDay = (startDay + 1) % 7;
  if (day === startDay) return "on_time";
  if (day === lateDay) return "late";
  return "missed";
}

function getWeekLabel(): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  return startOfWeek.toISOString().slice(0, 10);
}

// جلب السجلات (للمدمن)
router.get("/", requireAdmin, async (c) => {
  const userId = c.req.query('userId');
  const week = c.req.query('week');

  const allLogs = await db
    .select({ log: readingLogsTable, bookTitle: curriculumTable.title })
    .from(readingLogsTable)
    .leftJoin(curriculumTable, eq(readingLogsTable.bookId, curriculumTable.id))
    .where(userId ? eq(readingLogsTable.userId, parseInt(userId)) : undefined)
    .orderBy(readingLogsTable.date);

  return c.json(
    allLogs
      .filter((l) => !week || l.log.weekLabel === week)
      .map((l) => ({ ...l.log, bookTitle: l.bookTitle ?? null }))
  );
});

// سجلاتي الخاصة (للطالب)
router.get("/my", requireAuth, async (c) => {
  const userId = parseInt(getCookie(c, 'userId')!); // جلب من الكوكي

  const myLogs = await db
    .select({ log: readingLogsTable, bookTitle: curriculumTable.title })
    .from(readingLogsTable)
    .leftJoin(curriculumTable, eq(readingLogsTable.bookId, curriculumTable.id))
    .where(eq(readingLogsTable.userId, userId))
    .orderBy(readingLogsTable.date);

  return c.json(myLogs.map((l) => ({ ...l.log, bookTitle: l.bookTitle ?? null })));
});

// إضافة سجل جديد
router.post("/", requireAuth, async (c) => {
  const userId = parseInt(getCookie(c, 'userId')!);
  const { bookId, startPage, endPage, isCompleted, reflection } = await c.req.json();

  if (!bookId || startPage == null || endPage == null) {
    return c.json({ error: "Required fields missing" }, 400);
  }

  const [settings] = await db.select().from(systemSettingsTable).limit(1);
  const submissionStatus = settings ? getSubmissionStatus(settings) : "on_time";
  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const [log] = await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(readingLogsTable).values({
      userId, bookId, startPage, endPage, pagesRead: endPage - startPage + 1,
      isCompleted, submissionStatus, reflection: reflection ?? null, weekLabel: getWeekLabel()
    }).returning();

    await tx.update(usersTable).set({
      lastPage: endPage,
      completedBooks: isCompleted ? [...new Set([...(currentUser.completedBooks ?? []), bookId])] : currentUser.completedBooks,
      ...(isCompleted ? { currentBookId: null } : {}),
    }).where(eq(usersTable.id, userId));

    return [inserted];
  });

  return c.json(log, 201);
});

export default router;
