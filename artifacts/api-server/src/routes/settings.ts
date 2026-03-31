import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, systemSettingsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(systemSettingsTable).limit(1);

  if (!settings) {
    [settings] = await db.insert(systemSettingsTable).values({}).returning();
  }

  res.json(settings);
});

router.patch("/settings", requireAdmin, async (req, res): Promise<void> => {
  let [settings] = await db.select().from(systemSettingsTable).limit(1);

  const {
    weeklyQuota,
    submissionStartDay,
    submissionStartHour,
    normalDeadlineDay,
    normalDeadlineHour,
    lateDeadlineDay,
    lateDeadlineHour,
    gradeThresholdExcellent,
    gradeThresholdGood,
    gradeThresholdAcceptable,
  } = req.body as Partial<typeof systemSettingsTable.$inferInsert>;

  const updates: Partial<typeof systemSettingsTable.$inferInsert> = {};
  if (weeklyQuota != null) updates.weeklyQuota = weeklyQuota;
  if (submissionStartDay != null) updates.submissionStartDay = submissionStartDay;
  if (submissionStartHour != null) updates.submissionStartHour = submissionStartHour;
  if (normalDeadlineDay != null) updates.normalDeadlineDay = normalDeadlineDay;
  if (normalDeadlineHour != null) updates.normalDeadlineHour = normalDeadlineHour;
  if (lateDeadlineDay != null) updates.lateDeadlineDay = lateDeadlineDay;
  if (lateDeadlineHour != null) updates.lateDeadlineHour = lateDeadlineHour;
  if (gradeThresholdExcellent != null) updates.gradeThresholdExcellent = gradeThresholdExcellent;
  if (gradeThresholdGood != null) updates.gradeThresholdGood = gradeThresholdGood;
  if (gradeThresholdAcceptable != null) updates.gradeThresholdAcceptable = gradeThresholdAcceptable;

  if (!settings) {
    [settings] = await db.insert(systemSettingsTable).values(updates).returning();
  } else {
    [settings] = await db
      .update(systemSettingsTable)
      .set(updates)
      .where(eq(systemSettingsTable.id, settings.id))
      .returning();
  }

  res.json(settings);
});

export default router;
