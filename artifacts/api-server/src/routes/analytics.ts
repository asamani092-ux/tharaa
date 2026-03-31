import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, readingLogsTable, batchesTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/analytics/overview", requireAdmin, async (_req, res): Promise<void> => {
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

  res.json({
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

router.get("/analytics/user/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
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

  res.json({
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

router.get("/analytics/batch/:batchId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.batchId) ? req.params.batchId[0] : req.params.batchId;
  const batchId = parseInt(raw, 10);
  if (isNaN(batchId)) {
    res.status(400).json({ error: "Invalid batchId" });
    return;
  }

  const [batch] = await db.select().from(batchesTable).where(eq(batchesTable.id, batchId));
  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.batchId, batchId));
  const userIds = new Set(users.map((u) => u.id));

  const logs = await db.select().from(readingLogsTable);
  const batchLogs = logs.filter((l) => userIds.has(l.userId));

  const totalUsers = users.length;
  const totalPagesRead = batchLogs.reduce((sum, l) => sum + l.pagesRead, 0);
  const avgPagesPerUser = totalUsers > 0 ? totalPagesRead / totalUsers : 0;
  const onTimeRate = batchLogs.length > 0 ? (batchLogs.filter((l) => l.submissionStatus === "on_time").length / batchLogs.length) * 100 : 0;
  const lateRate = batchLogs.length > 0 ? (batchLogs.filter((l) => l.submissionStatus === "late").length / batchLogs.length) * 100 : 0;
  const missedRate = batchLogs.length > 0 ? (batchLogs.filter((l) => l.submissionStatus === "missed").length / batchLogs.length) * 100 : 0;

  const topReaders = users
    .map((u) => {
      const userLogs = batchLogs.filter((l) => l.userId === u.id);
      return {
        userId: u.id,
        name: u.name,
        totalPagesRead: userLogs.reduce((sum, l) => sum + l.pagesRead, 0),
        totalLogs: userLogs.length,
        onTimeCount: userLogs.filter((l) => l.submissionStatus === "on_time").length,
        lateCount: userLogs.filter((l) => l.submissionStatus === "late").length,
        missedCount: userLogs.filter((l) => l.submissionStatus === "missed").length,
        completedBooks: (u.completedBooks ?? []).length,
        currentStreak: 0,
        complianceRate: userLogs.length > 0 ? (userLogs.filter((l) => l.submissionStatus === "on_time").length / userLogs.length) * 100 : 0,
        recentLogs: [],
      };
    })
    .sort((a, b) => b.totalPagesRead - a.totalPagesRead)
    .slice(0, 10);

  res.json({
    batchId: batch.id,
    batchName: batch.name,
    totalUsers,
    totalPagesRead,
    avgPagesPerUser,
    onTimeRate,
    lateRate,
    missedRate,
    topReaders,
  });
});

export default router;
