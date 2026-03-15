import "dotenv/config";
import express from "express";
import { login } from "./services/xui.service.js";
import clientRouter from "./routes/client.routes.js";

const app = express();
app.use(express.json());
app.use(clientRouter);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).json({ error: err.message });
});
const PORT = 3000;

await login();
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
