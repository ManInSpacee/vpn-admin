import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import {
  fetchAllClients,
  fetchInbounds,
  fetchFormattedClients,
} from "../services/xui.service.js";
import { auth } from "../middleware/auth.js";

const clientRouter = Router();
clientRouter.use(auth);

clientRouter.get("/auth", (_req: any, res: any) => res.sendStatus(200));

clientRouter.get(
  "/inbounds",
  asyncHandler(async (_req: any, res: any) => {
    res.json(await fetchInbounds());
  }),
);

clientRouter.get(
  "/clients",
  asyncHandler(async (_req: any, res: any) => {
    const clients = await fetchFormattedClients();
    return res.status(200).json({ clients });
  }),
);

clientRouter.get(
  "/clients/:email",
  asyncHandler(async (req: any, res: any) => {
    const clients = await fetchAllClients();
    const client = clients.find((u: any) => u.email === req.params.email);
    if (!client) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ client });
  }),
);

clientRouter.post(
  "/clients",
  asyncHandler(async (_req: any, res: any) => {
    res.status(410).json({ error: "Deprecated. Use POST /profiles instead." });
  }),
);

export default clientRouter;
