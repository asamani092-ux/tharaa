import { pgTable, serial, text, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { batchesTable } from "./batches";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"),
  batchId: integer("batch_id").references(() => batchesTable.id, { onDelete: 'set null' }),
  status: text("status").notNull().default("pending"),
  currentBookId: integer("current_book_id"),
  lastPage: integer("last_page").notNull().default(0),
  phaseNumber: integer("phase_number"),
  levelType: text("level_type").default("basic"),
  completedBooks: json("completed_books").$type<number[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
