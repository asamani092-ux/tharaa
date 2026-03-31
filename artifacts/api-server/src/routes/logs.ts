import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, readingLogsTable, curriculumTable, systemSettingsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function getSubmissionStatus(settings: typeof systemSettingsTable.$inferSelect): string {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  const startDay = settings.submissionStartDay;
  const startHour = settings.submissionStartHour;
  const normalDay = settings.normalDeadlineDay;
  const normalHour = settings.normalDeadlineHour;
  const lateDay = settings.lateDeadlineDay;
  const lateHour = settings.lateDeadlineHour;

  const toMinutes = (d: number, h: number) => d * 24 * 60 + h * 60;
  const nowMins = toMinutes(day, hour);
  const startMins = toMinutes(startDay, startHour);
  const normalMins = toMinutes(normalDay, normalHour);
  const lateMins = toMinutes(lateDay, lateHour);

  if (nowMins >= startMins && nowMins <= normalMins) return "on_time";
  if (nowMins > normalMins && nowMins <= lateMins) return "late";
  return "missed";
}

function getWeekLabel(): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  return startOfWeek.toISOString().slice(0, 10);
}

router.get("/logs", requireAdmin, async (req, res): Promise<void> => {
  const { userId, week } = req.query as { userId?: string; week?: string };

  const allLogs = await db
    .select({
      log: readingLogsTable,
      bookTitle: curriculumTable.title,
    })
    .from(readingLogsTable)
    .leftJoin(curriculumTable, eq(readingLogsTable.bookId, curriculumTable.id))
    .where(
      userId ? eq(readingLogsTable.userId, parseInt(userId)) : undefined
    )
    .orderBy(readingLogsTable.date);

  res.json(
    allLogs
      .filter((l) => !week || l.log.weekLabel === week)
      .map((l) => ({
        ...l.log,
        bookTitle: l.bookTitle ?? null,
      }))
  );
});

router.get("/logs/my", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const myLogs = await db
    .select({
      log: readingLogsTable,
      bookTitle: curriculumTable.title,
    })
    .from(readingLogsTable)
    .leftJoin(curriculumTable, eq(readingLogsTable.bookId, curriculumTable.id))
    .where(eq(readingLogsTable.userId, userId))
    .orderBy(readingLogsTable.date);

  res.json(
    myLogs.map((l) => ({
      ...l.log,
      bookTitle: l.bookTitle ?? null,
    }))
  );
});

router.post("/logs", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const { bookId, startPage, endPage, isCompleted, reflection } = req.body as {
    bookId: number;
    startPage: number;
    endPage: number;
    isCompleted: boolean;
    reflection?: string | null;
  };

  if (!bookId || startPage == null || endPage == null || isCompleted == null) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }

  const [settings] = await db.select().from(systemSettingsTable).limit(1);
  const submissionStatus = settings ? getSubmissionStatus(settings) : "on_time";
  const weekLabel = getWeekLabel();
  const pagesRead = endPage - startPage + 1;

  const [log] = await db
    .insert(readingLogsTable)
    .values({
      userId,
      bookId,
      startPage,
      endPage,
      pagesRead,
      isCompleted,
      submissionStatus,
      reflection: reflection ?? null,
      weekLabel,
    })
    .returning();

  const [book] = await db.select().from(curriculumTable).where(eq(curriculumTable.id, bookId));

  res.status(201).json({
    ...log,
    bookTitle: book?.title ?? null,
  });
});

router.get("/logs/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [result] = await db
    .select({
      log: readingLogsTable,
      bookTitle: curriculumTable.title,
    })
    .from(readingLogsTable)
    .leftJoin(curriculumTable, eq(readingLogsTable.bookId, curriculumTable.id))
    .where(eq(readingLogsTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Log not found" });
    return;
  }

  if (req.session.role !== "admin" && req.session.userId !== result.log.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({ ...result.log, bookTitle: result.bookTitle ?? null });
});

export default router;
