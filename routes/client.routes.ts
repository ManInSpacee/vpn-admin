import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import {
  fetchAllClients,
  fetchInbounds,
  createClient,
  fetchFormattedClients,
} from "../services/xui.service.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get(
  "/inbounds",
  asyncHandler(async (_req: any, res: any) => {
    res.json(await fetchInbounds());
  }),
);

router.get(
  "/clients",
  asyncHandler(async (_req: any, res: any) => {
    const clients = await fetchFormattedClients();
    return res.status(200).json({ clients });
  }),
);

router.get(
  "/clients/:email",
  asyncHandler(async (req: any, res: any) => {
    const clients = await fetchAllClients();
    const client = clients.find((u: any) => u.email === req.params.email);
    if (!client) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ client });
  }),
);

router.post(
  "/clients",
  auth,
  asyncHandler(async (req: any, res: any) => {
    const result = await createClient(req.body.email, req.body.plan);
    return res.status(201).json(result);
  }),
);

export default router;
