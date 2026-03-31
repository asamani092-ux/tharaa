import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, curriculumTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/curriculum", requireAuth, async (req, res): Promise<void> => {
  const { phaseNumber, level } = req.query as { phaseNumber?: string; level?: string };

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

  res.json(books);
});

router.post("/curriculum", requireAdmin, async (req, res): Promise<void> => {
  const { phaseNumber, phaseName, levelType, bookCode, title, totalPages, pdfUrl, publisher, author, orderInLevel } =
    req.body as {
      phaseNumber: number;
      phaseName: string;
      levelType: string;
      bookCode: string;
      title: string;
      totalPages: number;
      pdfUrl?: string | null;
      publisher?: string | null;
      author?: string | null;
      orderInLevel: number;
    };

  if (!phaseNumber || !phaseName || !levelType || !bookCode || !title || !totalPages) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }

  const [book] = await db
    .insert(curriculumTable)
    .values({
      phaseNumber,
      phaseName,
      levelType,
      bookCode,
      title,
      totalPages,
      pdfUrl: pdfUrl ?? null,
      publisher: publisher ?? null,
      author: author ?? null,
      orderInLevel: orderInLevel ?? 1,
    })
    .returning();

  res.status(201).json(book);
});

router.patch("/curriculum/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const updates = req.body as Partial<typeof curriculumTable.$inferInsert>;
  const [book] = await db
    .update(curriculumTable)
    .set(updates)
    .where(eq(curriculumTable.id, id))
    .returning();

  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  res.json(book);
});

router.delete("/curriculum/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(curriculumTable).where(eq(curriculumTable.id, id));
  res.sendStatus(204);
});

export default router;
