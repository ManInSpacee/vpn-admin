import { Router } from "express";
import authJwt from "../middleware/authJwt.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/helpers.js";
import { createClient, XuiServer } from "../services/xui.service.js";

const adminRouter = Router();
adminRouter.use(authJwt);
adminRouter.use(requireAdmin);

adminRouter.post(
  "/admin/servers",
  asyncHandler(async (req: any, res: any) => {
    const {
      id,
      name,
      country,
      host,
      type,
      xuiUrl,
      xuiSubUrl,
      xuiUsername,
      xuiPassword,
      inboundId,
      maxClients,
    } = req.body;

    const server = await prisma.server.create({
      data: {
        id,
        name,
        country,
        host,
        type,
        xuiUrl,
        xuiSubUrl,
        xuiUsername,
        xuiPassword,
        inboundId,
        maxClients,
      },
    });

    // Добавить ключи на новый сервер для всех существующих активных профилей
    if (server.inboundId && server.type === "xui") {
      const profiles = await prisma.vpnProfile.findMany({
        include: {
          user: { omit: { password_hash: true } },
          userPlan: { include: { plan: true } },
        },
      });

      for (const profile of profiles) {
        try {
          const client = await createClient(
            profile.user.email + "_" + profile.slotNumber,
            profile.userPlan.plan.duration,
            server as XuiServer,
            server.inboundId,
          );
          await prisma.profileServerLink.create({
            data: {
              profileId: profile.id,
              serverId: server.id,
              subId: client.subId,
              remoteId: client.clientUuid,
            },
          });
        } catch (e) {
          console.error(
            `Failed to create client for profile ${profile.id}:`,
            e,
          );
        }
      }
    }

    return res.status(201).json({ server });
  }),
);

adminRouter.post(
  "/admin/subscriptions",
  asyncHandler(async (req: any, res: any) => {
    const { email, planId } = req.body;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const startsAt = new Date();
    const expiresAt = new Date(startsAt);
    expiresAt.setDate(expiresAt.getDate() + plan.duration);

    const userPlan = await prisma.userPlan.create({
      data: {
        userId: user.id,
        planId: plan.id,
        startsAt,
        expiresAt,
      },
    });
    return res.status(201).json({ userPlan });
  }),
);

adminRouter.get(
  "/admin/users",
  asyncHandler(async (req: any, res: any) => {
    const userEmail = req.query.email;
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      omit: { password_hash: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ user });
  }),
);

export default adminRouter;
