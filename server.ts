import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import subRouter from "./routes/sub.routes.js";
import adminRouter from "./routes/admin.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import cors from "cors";

const app = express();
if (
  !process.env.JWT_ACCESS_SECRET ||
  !process.env.JWT_REFRESH_SECRET ||
  !process.env.DATABASE_URL ||
  !process.env.CORS_ORIGIN ||
  !process.env.HELEKET_MERCHANT_ID ||
  !process.env.HELEKET_API_KEY
)
  throw new Error("Check the env!");

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(subRouter);
app.use(authRouter);
app.use(paymentRouter);
app.use(userRouter);
app.use(adminRouter);
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err.message);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
  res.status(status).json({ error: err.message });
});
const PORT = 3000;

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
