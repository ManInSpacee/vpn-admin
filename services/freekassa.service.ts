import axios from "axios";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";

const FK_API = "https://api.fk.life/v1";

function makeSign(body: Record<string, any>): string {
  const keys = Object.keys(body).sort();
  const values = keys.map((k) => body[k]);
  const signString = values.join("|");
  return crypto
    .createHmac("sha256", process.env.FK_SECRET_WORD_1!)
    .update(signString)
    .digest("hex");
}

export async function createFreekassaInvoice(
  userId: string,
  planId: string,
  ip: string,
) {
  const orderId = crypto.randomUUID().replace(/-/g, "");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");
  if (!plan.price) throw new Error("Plan has no RUB price configured");

  const userPlan = await prisma.userPlan.create({
    data: {
      userId,
      planId,
      startsAt: new Date(),
      expiresAt: new Date(),
      active: false,
    },
  });

  await prisma.payment.create({
    data: {
      userId,
      userPlanId: userPlan.id,
      amount: plan.price,
      status: "pending",
      provider: "freekassa",
      providerId: orderId,
    },
  });

  const userEmail = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const body = {
    shopId: Number(process.env.FK_MERCHANT_ID),
    nonce: Date.now(),
    paymentId: orderId,
    i: 44,
    email: userEmail?.email,
    ip,
    amount: plan.price,
    currency: "RUB",
  };

  const signature = makeSign(body);

  const res = await axios.post(`${FK_API}/orders/create`, {
    ...body,
    signature,
  });

  return { url: res.data.location, orderId };
}

export function verifyFreekassaWebhookSign(
  payload: Record<string, any>,
): boolean {
  const { MERCHANT_ID, AMOUNT, MERCHANT_ORDER_ID, SIGN } = payload;
  const signString = `${MERCHANT_ID}:${AMOUNT}:${process.env.FK_SECRET_WORD_2}:${MERCHANT_ORDER_ID}`;
  const expected = crypto.createHash("md5").update(signString).digest("hex");
  return SIGN === expected;
}
