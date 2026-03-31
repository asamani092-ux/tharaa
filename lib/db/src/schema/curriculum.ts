import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const curriculumTable = pgTable("curriculum", {
  id: serial("id").primaryKey(),
  phaseNumber: integer("phase_number").notNull(),
  phaseName: text("phase_name").notNull(),
  levelType: text("level_type").notNull().default("basic"),
  bookCode: text("book_code").notNull(),
  title: text("title").notNull(),
  totalPages: integer("total_pages").notNull(),
  pdfUrl: text("pdf_url"),
  publisher: text("publisher"),
  author: text("author"),
  orderInLevel: integer("order_in_level").notNull().default(1),
});

export const insertCurriculumSchema = createInsertSchema(curriculumTable).omit({ id: true });
export type InsertCurriculum = z.infer<typeof insertCurriculumSchema>;
export type CurriculumBook = typeof curriculumTable.$inferSelect;
