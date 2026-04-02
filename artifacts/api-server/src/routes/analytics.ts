import { Hono } from 'hono';
import { eq, sql } from "drizzle-orm";
import { db, usersTable, readingLogsTable, batchesTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router = new Hono();

// نظرة عامة على التحليلات
router.get("/overview", requireAdmin, async (c) => {
  const users = await db.select().from(usersTable).where(eq(usersTable.role, "student"));
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const pendingUsers = users.filter((u) => u.status === "pending").length;

  const logs = await db.select().from(readingLogsTable);
  const totalLogsSubmitted = logs.length;
  const totalPagesRead = logs.reduce((sum, l) => sum + l.pagesRead, 0);
  const onTimeSubmissions = logs.filter((l) => l.submissionStatus === "on_time").length;
  const lateSubmissions = logs.filter((l) => l.submissionStatus === "late").length;
  const missedSubmissions = logs.filter((l) => l.submissionStatus === "missed").length;
  const completedBooksCount = logs.filter((l) => l.isCompleted).length;

  const batches = await db.select().from(batchesTable);
  const batchBreakdown = batches.map((b) => {
    const batchUsers = users.filter((u) => u.batchId === b.id);
    const batchUserIds = new Set(batchUsers.map((u) => u.id));
    const batchLogs = logs.filter((l) => batchUserIds.has(l.userId));
    const totalBatchPages = batchLogs.reduce((sum, l) => sum + l.pagesRead, 0);
    return {
      batchId: b.id,
      batchName: b.name,
      userCount: batchUsers.length,
      totalPagesRead: totalBatchPages,
      avgPagesPerUser: batchUsers.length > 0 ? totalBatchPages / batchUsers.length : 0,
    };
  });

  return c.json({
    totalUsers,
    activeUsers,
    pendingUsers,
    totalPagesRead,
    totalLogsSubmitted,
    onTimeSubmissions,
    lateSubmissions,
    missedSubmissions,
    completedBooksCount,
    batchBreakdown,
  });
});

// تحليلات مستخدم محدد
router.get("/user/:id", requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: "Invalid id" }, 400);
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const logs = await db
    .select()
    .from(readingLogsTable)
    .where(eq(readingLogsTable.userId, id))
    .orderBy(readingLogsTable.date);

  const totalPagesRead = logs.reduce((sum, l) => sum + l.pagesRead, 0);
  const totalLogs = logs.length;
  const onTimeCount = logs.filter((l) => l.submissionStatus === "on_time").length;
  const lateCount = logs.filter((l) => l.submissionStatus === "late").length;
  const missedCount = logs.filter((l) => l.submissionStatus === "missed").length;
  const completedBooks = (user.completedBooks ?? []).length;
  const complianceRate = totalLogs > 0 ? (onTimeCount / totalLogs) * 100 : 0;

  // Streak logic
  let currentStreak = 0;
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const log of sortedLogs) {
    if (log.submissionStatus !== "missed") currentStreak++;
    else break;
  }

  const recentLogs = sortedLogs.slice(0, 10).map((l) => ({
    ...l,
    bookTitle: null,
  }));

  return c.json({
    userId: user.id,
    name: user.name,
    totalPagesRead,
    totalLogs,
    onTimeCount,
    lateCount,
    missedCount,
    completedBooks,
    currentStreak,
    complianceRate,
    recentLogs,
  });
});

// تحليلات دفعة (Batch) محددة
router.get("/batch/:batchId", requireAdmin, async (c) => {
  const batchId = parseInt(c.req.param('batchId'), 10);
  if (isNaN(batchId)) {
    return c.json({ error: "Invalid batchId" }, 400);
  }

  const [batch] = await db.select().from(batchesTable).where(eq(batchesTable.id, batchId));
  if (!batch) {
    return c.json({ error: "Batch not found" }, 404);
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.batchId, batchId));
  const userIds = new Set(users.map((u) => u.id));

  // ملاحظة: لجعل الكود أرخص وأسرع، يفضل استخدام SQL aggregation مستقبلاً بدلاً من جلب كل السجلات
  const logs = await db.select().from(readingLogsTable);
  const batchLogs = logs.filter((l) => userIds.has(l.userId));

  const totalUsers = users.length;
  const totalPagesRead = batchLogs.reduce((sum, l) => sum + l.pagesRead, 0);
  const avgPagesPerUser = totalUsers > 0 ? totalPagesRead / totalUsers : 0;
  const totalBatchLogs = batchLogs.length;

  const getRate = (status: string) => 
    totalBatchLogs > 0 ? (batchLogs.filter((l) => l.submissionStatus === status).length / totalBatchLogs) * 100 : 0;

  const topReaders = users
    .map((u) => {
      const userLogs = batchLogs.filter((l) => l.userId === u.id);
      return {
        userId: u.id,
        name: u.name,
        totalPagesRead: userLogs.reduce((sum, l) => sum + l.pagesRead, 0),
        totalLogs: userLogs.length,
        complianceRate: userLogs.length > 0 ? (userLogs.filter((l) => l.submissionStatus === "on_time").length / userLogs.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalPagesRead - a.totalPagesRead)
    .slice(0, 10);

  return c.json({
    batchId: batch.id,
    batchName: batch.name,
    totalUsers,
    totalPagesRead,
    avgPagesPerUser,
    onTimeRate: getRate("on_time"),
    lateRate: getRate("late"),
    missedRate: getRate("missed"),
    topReaders,
  });
});

export default router;
