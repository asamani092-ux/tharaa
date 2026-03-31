import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { normalizePhone, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { phone, password } = req.body as { phone: string; password: string };
  if (!phone || !password) {
    res.status(400).json({ error: "Phone and password are required" });
    return;
  }

  const normalized = normalizePhone(phone);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, normalized));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.status === "suspended") {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      batchId: user.batchId,
      status: user.status,
      currentBookId: user.currentBookId,
      lastPage: user.lastPage,
      phaseNumber: user.phaseNumber,
      levelType: user.levelType,
      completedBooks: user.completedBooks ?? [],
    },
    role: user.role,
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

router.put("/auth/admin", requireAdmin, async (req, res): Promise<void> => {
  const { name, phone, currentPassword, newPassword } = req.body as {
    name?: string;
    phone?: string;
    currentPassword: string;
    newPassword?: string;
  };

  if (!currentPassword) {
    res.status(400).json({ error: "currentPassword is required" });
    return;
  }

  const [admin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));

  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (phone != null) updates.phone = normalizePhone(phone);
  if (newPassword) updates.passwordHash = await bcrypt.hash(newPassword, 10);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.session.userId!))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    phone: updated.phone,
    role: updated.role,
    status: updated.status,
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.json({ authenticated: false });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    req.session.destroy(() => {});
    res.json({ authenticated: false });
    return;
  }

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      batchId: user.batchId,
      status: user.status,
      currentBookId: user.currentBookId,
      lastPage: user.lastPage,
      phaseNumber: user.phaseNumber,
      levelType: user.levelType,
      completedBooks: user.completedBooks ?? [],
    },
  });
});

export default router;
