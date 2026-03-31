import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ADMIN_PHONE = "0500000000";
const DEFAULT_ADMIN_PASSWORD = "admin123";

async function resetAdminPassword() {
  const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  const updated = await db
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.phone, DEFAULT_ADMIN_PHONE))
    .returning({ id: users.id, phone: users.phone });

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
