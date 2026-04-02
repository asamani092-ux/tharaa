import { Hono } from 'hono';
import { HealthCheckResponse } from "@workspace/api-zod";

const router = new Hono();

// اختبار حالة النظام (Health Check)
router.get("/healthz", (c) => {
  // استخدام Zod للتحقق من البيانات (بما أنك تستخدم @workspace/api-zod)
  const data = HealthCheckResponse.parse({ status: "ok" });
  
  return c.json(data);
});

export default router;
