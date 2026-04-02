import app from "./app";
import { logger } from "./lib/logger";

/**
 * في بيئة Cloudflare Workers:
 * 1. لا نحتاج لـ app.listen
 * 2. يجب تصدير التطبيق كـ default export
 */

// إذا كنت تستخدم Hono، هذا السطر يكفي:
// export default app;

// إذا كنت تستخدم Express أو إطار عمل آخر، نستخدم هذا التغليف:
export default {
  async fetch(request: Request, env: any, ctx: any) {
    // تمرير المتغيرات من السحاب للكود (مثل DATABASE_URL)
    // ملاحظة: يمكنك الوصول لـ env.DATABASE_URL هنا إذا احتجت
    
    try {
      // معالجة الطلب وتمريره للتطبيق
      return await app.fetch(request, env, ctx); 
    } catch (err) {
      logger.error({ err }, "Error handling request at Edge");
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
