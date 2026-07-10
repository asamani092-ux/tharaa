import { Hono } from 'hono';
import { eq } from "drizzle-orm";
import { db, systemSettingsTable } from "@workspace/db";
import { requireAuth, requireStaff } from "../lib/auth";

const router = new Hono();

router.get("/", requireAuth, async (c) => {
  let [settings] = await db.select().from(systemSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(systemSettingsTable).values({}).returning();
  }
  return c.json(settings);
});

router.patch("/", requireStaff, async (c) => {
  let [settings] = await db.select().from(systemSettingsTable).limit(1);
  const body = await c.req.json();
  const updates: Record<string, unknown> = { ...body };
  const pdfKeys = ["curriculumPdfUrl", "curriculumPdfUrlFull", "curriculumPdfUrlSimplified"] as const;
  for (const key of pdfKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const url = body[key];
      updates[key] =
        typeof url === "string" && url.trim() !== "" ? url.trim() : null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "priorAchievementEnabled")) {
    updates.priorAchievementEnabled = !!body.priorAchievementEnabled;
  }
  if (Object.prototype.hasOwnProperty.call(body, "atRiskInactiveDays")) {
    updates.atRiskInactiveDays = Math.max(1, Math.min(90, Number(body.atRiskInactiveDays) || 14));
  }

  if (!settings) {
    [settings] = await db.insert(systemSettingsTable).values(updates).returning();
  } else {
    [settings] = await db
      .update(systemSettingsTable)
      .set(updates)
      .where(eq(systemSettingsTable.id, settings.id))
      .returning();
  }
  return c.json(settings);
});

export default router;
