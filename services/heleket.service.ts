import crypto from "node:crypto";
import axios from "axios";
import { prisma } from "../lib/prisma.js";

const HELEKET_API = "https://api.heleket.com/v1";

function makeSign(body: object): string {
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64");
  return crypto
    .createHash("md5")
    .update(encoded + process.env.HELEKET_API_KEY!)
    .digest("hex");
}

export function verifyWebhookSign(payload: Record<string, any>): boolean {
  const { sign, ...data } = payload;
  // Heleket считает подпись с экранированными слешами (как PHP json_encode)
  const json = JSON.stringify(data).replace(/\//g, "\\/");
  const expected = crypto
    .createHash("md5")
    .update(Buffer.from(json).toString("base64") + process.env.HELEKET_API_KEY!)
    .digest("hex");
  return sign === expected;
}

export async function createInvoice(userId: string, planId: string) {
  const orderId = crypto.randomUUID().replace(/-/g, "");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");
  if (!plan.priceUsd) throw new Error("Plan has no USD price configured");

  const userPlan = await prisma.userPlan.create({
    data: {
      userId,
      planId,
      startsAt: new Date(),
      expiresAt: new Date(), // временно, обновим при оплате
      active: false,
    },
  });

  await prisma.payment.create({
    data: {
      userId,
      userPlanId: userPlan.id,
      amount: plan.priceUsd,
      status: "pending",
      provider: "heleket",
      providerId: orderId,
    },
  });

  const amountUsd = (plan.priceUsd / 100).toFixed(2);
  const body = {
    amount: amountUsd,
    currency: "USDT",
    order_id: orderId,
    url_return: "https://lk.openworldlink.ru/payment/failed",
    url_success: "https://lk.openworldlink.ru/payment/success",
    url_callback: "https://api.openworldlink.ru/payments/heleket/webhook",
  };

  const res = await axios.post(`${HELEKET_API}/payment`, body, {
    headers: {
      "Content-Type": "application/json",
      merchant: process.env.HELEKET_MERCHANT_ID!,
      sign: makeSign(body),
    },
  });

  return { url: res.data.result.url, orderId };
}

export async function activateSubscription(orderId: string) {
  const payment = await prisma.payment.findFirst({
    where: { providerId: orderId, provider: "heleket" },
    include: { userPlan: true },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "paid") return; // уже активирован

  const plan = await prisma.plan.findUnique({
    where: { id: payment.userPlan.planId },
  });
  if (!plan) throw new Error("Plan not found");

  const startsAt = new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setDate(expiresAt.getDate() + plan.duration);

  await prisma.userPlan.update({
    where: { id: payment.userPlanId },
    data: { active: true, startsAt, expiresAt },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "paid" },
  });
}
