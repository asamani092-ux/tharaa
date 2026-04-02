import app from "./app";

// في Cloudflare Workers نستخدم التصدير الافتراضي بدلاً من app.listen
export default {
  async fetch(request: Request, env: any, ctx: any) {
    // تمرير الطلبات إلى تطبيق Express
    // ملاحظة: قد تحتاج لمكتبة محول (Adapter) إذا لم يعمل Express مباشرة
    return (app as any).handle(request, env, ctx);
  },
};
