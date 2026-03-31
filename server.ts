import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import clientRouter from "./routes/client.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import subRouter from "./routes/sub.routes.js";
import authJwt from "./middleware/authJwt.js";
import cors from "cors";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(cookieParser());
app.use(subRouter);
app.use(authRouter);
//app.use(clientRouter);
app.use(userRouter);
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});
const PORT = 3000;

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
