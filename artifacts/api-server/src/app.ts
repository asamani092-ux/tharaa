import express, { type Express } from "express";
import cors from "cors";
// تم تعطيل pino و session مؤقتاً لأنها غير متوافقة مع Cloudflare Workers
import router from "./routes";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ملاحظة: Cloudflare هو "Serverless"، لذا Memory Session لن تعمل بشكل مستقر
// سنقوم بربط الـ API أولاً ثم نفكر في حلول البديلة مثل (JWT)

app.use("/api", router);

export default app;
