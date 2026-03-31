import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, and, inArray } from "drizzle-orm";
import { db, usersTable, batchesTable, readingLogsTable } from "@workspace/db";
import { requireAdmin, requireAuth, normalizePhone } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const { batchId, status } = req.query as { batchId?: string; status?: string };

  let query = db.select().from(usersTable).where(eq(usersTable.role, "student"));

  const users = await db
    .select()
    .from(usersTable)
    .where(
      batchId && status
        ? and(eq(usersTable.batchId, parseInt(batchId)), eq(usersTable.status, status), eq(usersTable.role, "student"))
        : batchId
        ? and(eq(usersTable.batchId, parseInt(batchId)), eq(usersTable.role, "student"))
        : status
        ? and(eq(usersTable.status, status), eq(usersTable.role, "student"))
        : eq(usersTable.role, "student")
    )
    .orderBy(usersTable.createdAt);

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      batchId: u.batchId,
      status: u.status,
      currentBookId: u.currentBookId,
      lastPage: u.lastPage,
      phaseNumber: u.phaseNumber,
      levelType: u.levelType,
      completedBooks: u.completedBooks ?? [],
      createdAt: u.createdAt,
    }))
  );
  void query;
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const { name, phone, password, batchId, phaseNumber, levelType } = req.body as {
    name: string;
    phone: string;
    password: string;
    batchId?: number;
    phaseNumber?: number;
    levelType?: string;
  };

  if (!name || !phone || !password) {
    res.status(400).json({ error: "Name, phone and password are required" });
    return;
  }

  const normalized = normalizePhone(phone);
  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      phone: normalized,
      passwordHash,
      role: "student",
      status: "pending",
      batchId: batchId ?? null,
      phaseNumber: phaseNumber ?? 1,
      levelType: levelType ?? "basic",
      completedBooks: [],
      lastPage: 0,
    })
    .returning();

  res.status(201).json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    batchId: user.batchId,
    status: user.status,
    currentBookId: user.currentBookId,
    lastPage: user.lastPage,
    phaseNumber: user.phaseNumber,
    levelType: user.levelType,
    completedBooks: user.completedBooks ?? [],
    createdAt: user.createdAt,
  });
});

router.post("/users/bulk", requireAdmin, async (req, res): Promise<void> => {
  const { batchId, rawText, phaseNumber, levelType } = req.body as {
    batchId: number;
    rawText: string;
    phaseNumber: number;
    levelType: string;
  };

  if (!batchId || !rawText) {
    res.status(400).json({ error: "batchId and rawText are required" });
    return;
  }

  const lines = rawText.trim().split("\n").filter(Boolean);
  const created: object[] = [];
  let failed = 0;

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) {
      failed++;
      continue;
    }
    const [namePart, phonePart, ...rest] = parts;
    const passwordPart = rest.join(" ");

    try {
      const normalized = normalizePhone(phonePart);
      const passwordHash = await bcrypt.hash(passwordPart, 10);
      const [user] = await db
        .insert(usersTable)
        .values({
          name: namePart,
          phone: normalized,
          passwordHash,
          role: "student",
          status: "active",
          batchId,
          phaseNumber: phaseNumber ?? 1,
          levelType: levelType ?? "basic",
          completedBooks: [],
          lastPage: 0,
        })
        .returning();
      created.push({
        id: user.id,
        name: user.name,
        phone: user.phone,
        batchId: user.batchId,
        status: user.status,
        currentBookId: user.currentBookId,
        lastPage: user.lastPage,
        phaseNumber: user.phaseNumber,
        levelType: user.levelType,
        completedBooks: user.completedBooks ?? [],
        createdAt: user.createdAt,
      });
    } catch {
      failed++;
    }
  }

  res.status(201).json({ created: created.length, failed, users: created });
});

router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
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

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    batchId: user.batchId,
    status: user.status,
    currentBookId: user.currentBookId,
    lastPage: user.lastPage,
    phaseNumber: user.phaseNumber,
    levelType: user.levelType,
    completedBooks: user.completedBooks ?? [],
    createdAt: user.createdAt,
  });
});

router.patch("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { name, phone, batchId, status, phaseNumber, levelType, currentBookId, lastPage } = req.body as {
    name?: string;
    phone?: string;
    batchId?: number | null;
    status?: string;
    phaseNumber?: number | null;
    levelType?: string | null;
    currentBookId?: number | null;
    lastPage?: number;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (phone != null) updates.phone = normalizePhone(phone);
  if (batchId !== undefined) updates.batchId = batchId;
  if (status != null) updates.status = status;
  if (phaseNumber !== undefined) updates.phaseNumber = phaseNumber;
  if (levelType !== undefined) updates.levelType = levelType;
  if (currentBookId !== undefined) updates.currentBookId = currentBookId;
  if (lastPage !== undefined) updates.lastPage = lastPage;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    batchId: user.batchId,
    status: user.status,
    currentBookId: user.currentBookId,
    lastPage: user.lastPage,
    phaseNumber: user.phaseNumber,
    levelType: user.levelType,
    completedBooks: user.completedBooks ?? [],
    createdAt: user.createdAt,
  });
});

router.put("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { name, phone, batchId, status, phaseNumber, levelType } = req.body as {
    name: string;
    phone: string;
    batchId?: number | null;
    status: string;
    phaseNumber?: number | null;
    levelType?: string | null;
  };

  if (!name || !phone || !status) {
    res.status(400).json({ error: "name, phone and status are required" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({
      name,
      phone: normalizePhone(phone),
      batchId: batchId !== undefined ? batchId : null,
      status,
      phaseNumber: phaseNumber !== undefined ? phaseNumber : null,
      levelType: levelType !== undefined ? levelType : null,
    })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    batchId: user.batchId,
    status: user.status,
    currentBookId: user.currentBookId,
    lastPage: user.lastPage,
    phaseNumber: user.phaseNumber,
    levelType: user.levelType,
    completedBooks: user.completedBooks ?? [],
    createdAt: user.createdAt,
  });
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

router.post("/users/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ status: "active" })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    batchId: user.batchId,
    status: user.status,
    currentBookId: user.currentBookId,
    lastPage: user.lastPage,
    phaseNumber: user.phaseNumber,
    levelType: user.levelType,
    completedBooks: user.completedBooks ?? [],
    createdAt: user.createdAt,
  });
});

router.patch("/users/:id/book", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  if (req.session.role !== "admin" && req.session.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { currentBookId, lastPage, completedBookId } = req.body as {
    currentBookId?: number | null;
    lastPage: number;
    completedBookId?: number | null;
  };

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let completedBooks = existing.completedBooks ?? [];
  if (completedBookId != null && !completedBooks.includes(completedBookId)) {
    completedBooks = [...completedBooks, completedBookId];
  }

  const [user] = await db
    .update(usersTable)
    .set({
      currentBookId: currentBookId !== undefined ? currentBookId : existing.currentBookId,
      lastPage,
      completedBooks,
    })
    .where(eq(usersTable.id, id))
    .returning();

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    batchId: user.batchId,
    status: user.status,
    currentBookId: user.currentBookId,
    lastPage: user.lastPage,
    phaseNumber: user.phaseNumber,
    levelType: user.levelType,
    completedBooks: user.completedBooks ?? [],
    createdAt: user.createdAt,
  });
});

router.get("/batches", requireAuth, async (_req, res): Promise<void> => {
  const batches = await db.select().from(batchesTable).orderBy(batchesTable.createdAt);
  res.json(batches);
});

router.post("/batches", requireAdmin, async (req, res): Promise<void> => {
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const [batch] = await db.insert(batchesTable).values({ name }).returning();
  res.status(201).json(batch);
});

router.put("/batches/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const [batch] = await db
    .update(batchesTable)
    .set({ name })
    .where(eq(batchesTable.id, id))
    .returning();

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  res.json(batch);
});

router.delete("/batches/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.transaction(async (tx) => {
    const batchUsers = await tx
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.batchId, id));

    const userIds = batchUsers.map((u) => u.id);

    if (userIds.length > 0) {
      await tx.delete(readingLogsTable).where(inArray(readingLogsTable.userId, userIds));
      await tx.delete(usersTable).where(inArray(usersTable.id, userIds));
    }

    await tx.delete(batchesTable).where(eq(batchesTable.id, id));
  });

  res.sendStatus(204);
});

export default router;
