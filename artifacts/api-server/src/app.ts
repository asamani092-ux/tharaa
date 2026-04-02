import { Hono } from 'hono';
import { cors } from 'hono/cors';
import router from "./routes";

const app = new Hono();

// تفعيل الـ CORS
app.use('*', cors());

// ربط المسارات (Routes)
// ملاحظة: قد تحتاج لتعديل بسيط في ملفات الـ routes لاحقاً ليتوافق مع Hono
app.route('/api', router);

export default app;
