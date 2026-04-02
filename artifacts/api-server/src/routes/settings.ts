import { Hono } from 'hono';
import { eq } from "drizzle-orm";
import { db, systemSettingsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = new Hono();

router.get("/", requireAuth, async (c) => {
  let [settings] = await db.select().from(systemSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(systemSettingsTable).values({}).returning();
  }
  return c.json(settings);
});

router.patch("/", requireAdmin, async (c) => {
  let [settings] = await db.select().from(systemSettingsTable).limit(1);
  const updates = await c.req.json();

  if (!settings) {
    [settings] = await db.insert(systemSettingsTable).values(updates).returning();
  } else {
    [settings] = await db.update(systemSettingsTable).set(updates)
      .where(eq(systemSettingsTable.id, settings.id)).returning();
  }
  return c.json(settings);
});

export default router;
