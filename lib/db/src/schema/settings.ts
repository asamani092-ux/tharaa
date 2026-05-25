import { pgTable, serial, integer, boolean, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  weeklyQuota: integer("weekly_quota").notNull().default(105),
  submissionStartDay: integer("submission_start_day").notNull().default(5),
  submissionStartHour: integer("submission_start_hour").notNull().default(0),
  normalDeadlineDay: integer("normal_deadline_day").notNull().default(5),
  normalDeadlineHour: integer("normal_deadline_hour").notNull().default(23),
  lateDeadlineDay: integer("late_deadline_day").notNull().default(6),
  lateDeadlineHour: integer("late_deadline_hour").notNull().default(23),
  gradeThresholdExcellent: integer("grade_threshold_excellent").notNull().default(90),
  gradeThresholdGood: integer("grade_threshold_good").notNull().default(75),
  gradeThresholdAcceptable: integer("grade_threshold_acceptable").notNull().default(60),
  allDaysActive: boolean("all_days_active").notNull().default(false),
  curriculumPdfUrl: text("curriculum_pdf_url"),
  priorAchievementEnabled: boolean("prior_achievement_enabled").notNull().default(true),
});

export const insertSettingsSchema = createInsertSchema(systemSettingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type SystemSettings = typeof systemSettingsTable.$inferSelect;
