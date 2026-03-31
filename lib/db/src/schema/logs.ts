import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { curriculumTable } from "./curriculum";

export const readingLogsTable = pgTable("reading_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  bookId: integer("book_id").notNull().references(() => curriculumTable.id),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  startPage: integer("start_page").notNull(),
  endPage: integer("end_page").notNull(),
  pagesRead: integer("pages_read").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  submissionStatus: text("submission_status").notNull().default("on_time"),
  reflection: text("reflection"),
  weekLabel: text("week_label"),
});

export const insertReadingLogSchema = createInsertSchema(readingLogsTable).omit({ id: true, date: true });
export type InsertReadingLog = z.infer<typeof insertReadingLogSchema>;
export type ReadingLog = typeof readingLogsTable.$inferSelect;
