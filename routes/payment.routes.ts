import { Router } from "express";
import authJwt from "../middleware/authJwt.js";
import { asyncHandler } from "../utils/helpers.js";
import {
  createInvoice,
  verifyWebhookSign,
  activateSubscription,
} from "../services/heleket.service.js";

const paymentRouter = Router();

// Создать инвойс Heleket — требует авторизации
paymentRouter.post(
  "/payments/heleket/create",
  authJwt,
  asyncHandler(async (req: any, res: any) => {
    const { planId, amount } = req.body;
    if (!planId || !amount)
      return res.status(400).json({ error: "planId and amount are required" });

    const { url, orderId } = await createInvoice(req.userId, planId, amount);
    return res.json({ url, orderId });
  }),
);

// Вебхук от Heleket — публичный, проверяем подпись
paymentRouter.post(
  "/payments/heleket/webhook",
  asyncHandler(async (req: any, res: any) => {
    const payload = req.body;

    if (!verifyWebhookSign(payload))
      return res.status(400).json({ error: "Invalid signature" });

    if (payload.status !== "paid")
      return res.status(200).json({ ok: true }); // игнорируем не-paid статусы

    await activateSubscription(payload.order_id);

    return res.status(200).json({ ok: true });
  }),
);

export default paymentRouter;
