import { Hono } from 'hono';
import { cors } from 'hono/cors';
import router from "./routes";

const app = new Hono();

app.use('/api/*', cors({
  origin: ['https://tharaa-web.pages.dev', 'https://tharaa.sam-dev.win'], // أضف الدومين الجديد هنا
  credentials: true,
}));
// ربط المسارات (Routes)
// ملاحظة: قد تحتاج لتعديل بسيط في ملفات الـ routes لاحقاً ليتوافق مع Hono
app.route('/api', router);

export default app;
