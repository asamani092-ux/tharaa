import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ADMIN_PHONE = "0500000000";
const DEFAULT_ADMIN_PASSWORD = "tharaa2025";

async function resetAdminPassword() {
  const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  const updated = await db
    .update(usersTable)
    .set({ passwordHash: hash })
    .where(eq(usersTable.phone, DEFAULT_ADMIN_PHONE))
    .returning({ id: usersTable.id, phone: usersTable.phone });

  if (updated.length === 0) {
    console.error(`No admin found with phone ${DEFAULT_ADMIN_PHONE}`);
    process.exit(1);
  }

  console.log(`✓ Admin password reset for phone ${DEFAULT_ADMIN_PHONE}`);
  console.log(`  Use password: ${DEFAULT_ADMIN_PASSWORD}`);
  process.exit(0);
}

resetAdminPassword().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
