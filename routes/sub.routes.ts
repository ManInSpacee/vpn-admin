import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import { getSubscription } from "../services/user.service.js";

const subRouter = Router();

subRouter.get(
  "/sub/:token",
  asyncHandler(async (req: any, res: any) => {
    const data = await getSubscription(req.params.token);
    res.set("Content-Type", "text/plain").send(data);
  }),
);

export default subRouter;
