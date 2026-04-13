import { prisma } from "../lib/prisma.js";

export async function activateSubscription(orderId: string, provider: string) {
  const payment = await prisma.payment.findFirst({
    where: { providerId: orderId, provider: provider },
    include: { userPlan: true },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "paid") return; // уже активирован

  const plan = await prisma.plan.findUnique({
    where: { id: payment.userPlan.planId },
  });
  if (!plan) throw new Error("Plan not found");

  const existingPlan = await prisma.userPlan.findFirst({
    where: { userId: payment.userPlan.userId, active: true },
  });

  if (existingPlan) {
    const expiresAt = existingPlan.expiresAt;
    expiresAt.setDate(expiresAt.getDate() + plan.duration);
    await prisma.userPlan.update({
      where: { id: existingPlan.id },
      data: { expiresAt },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "paid" },
    });
    return;
  }

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
