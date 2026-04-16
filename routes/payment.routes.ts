import { Router } from "express";
import authJwt from "../middleware/authJwt.js";
import { asyncHandler } from "../utils/helpers.js";
import {
  createHeleketInvoice,
  verifyHeleketWebhookSign,
} from "../services/heleket.service.js";
import {
  createFreekassaInvoice,
  verifyFreekassaWebhookSign,
} from "../services/freekassa.service.js";
import { activateSubscription } from "../services/sub.service.js";

const paymentRouter = Router();

// Создать инвойс Heleket — требует авторизации
paymentRouter.post(
  "/payments/heleket/create",
  authJwt,
  asyncHandler(async (req: any, res: any) => {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: "planId is required" });

    const { url, orderId } = await createHeleketInvoice(req.userId, planId);
    return res.json({ url, orderId });
  }),
);

// Вебхук от Heleket — публичный, проверяем подпись
paymentRouter.post(
  "/payments/heleket/webhook",
  asyncHandler(async (req: any, res: any) => {
    const payload = req.body;
    console.log("[heleket webhook]", JSON.stringify(payload));

    if (!verifyHeleketWebhookSign(payload)) {
      console.log("[heleket webhook] invalid signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (payload.status !== "paid") {
      console.log("[heleket webhook] status not paid:", payload.status);
      return res.status(200).json({ ok: true });
    }

    await activateSubscription(payload.order_id, "heleket");

    return res.status(200).json({ ok: true });
  }),
);

paymentRouter.post(
  "/payments/freekassa/create",
  authJwt,
  asyncHandler(async (req: any, res: any) => {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: "planId is required" });

    const ip = (req.headers["x-real-ip"] as string) || req.ip;

    const { url, orderId } = await createFreekassaInvoice(
      req.userId,
      planId,
      ip,
    );
    return res.json({ url, orderId });
  }),
);

paymentRouter.post(
  "/payments/freekassa/webhook",
  asyncHandler(async (req: any, res: any) => {
    const payload = req.body;
    console.log("[freekassa webhook]", JSON.stringify(payload));

    if (!verifyFreekassaWebhookSign(payload)) {
      console.log("[frekassa webhook] invalid signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    await activateSubscription(payload.MERCHANT_ORDER_ID, "freekassa");

    return res.status(200).json({ ok: true });
  }),
);

// Echo — просто возвращает то что пришло (для отладки вебхуков)
paymentRouter.all("/echo", (req: any, res: any) => {
  const data = {
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
  };
  console.log("[echo]", JSON.stringify(data));
  res.status(200).json(data);
});

export default paymentRouter;
