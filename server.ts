import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import subRouter from "./routes/sub.routes.js";
import adminRouter from "./routes/admin.routes.js";
import cors from "cors";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(subRouter);
app.use(authRouter);
//app.use(clientRouter);
app.use(userRouter);
app.use(adminRouter);
app.use((err: any, req: any, res: any, next: any) => {
  const status = err.status || 500;
  console.log(err.message);
  res.status(status).json({ error: err.message });
});
const PORT = 3000;

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
