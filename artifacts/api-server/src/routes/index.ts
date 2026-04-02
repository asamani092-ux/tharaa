import { Hono } from 'hono';
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import curriculumRouter from "./curriculum";
import logsRouter from "./logs";
import settingsRouter from "./settings";
import analyticsRouter from "./analytics";

const router = new Hono();

/**
 * ربط الموديولات بالمسارات (Paths) 
 * ملاحظة: قمنا بتنظيم المسارات لتطابق الهيكلية التي وضعتها في ملفات الـ Routes المحولة سابقاً
 */
router.route("/", healthRouter);            // سيستجيب لـ /api/healthz
router.route("/auth", authRouter);          // سيستجيب لـ /api/auth/login و /api/auth/logout
router.route("/users", usersRouter);        // سيستجيب لـ /api/users/
router.route("/curriculum", curriculumRouter); // سيستجيب لـ /api/curriculum/
router.route("/logs", logsRouter);          // سيستجيب لـ /api/logs/
router.route("/settings", settingsRouter);  // سيستجيب لـ /api/settings/
router.route("/analytics", analyticsRouter); // سيستجيب لـ /api/analytics/

export default router;
