import https from "node:https";
import axios from "axios";
import { prisma } from "../lib/prisma.js";
import { createClient, deleteClient, XuiServer } from "./xui.service.js";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPlans: {
        where: { active: true },
        take: 1,
      },
    },
  });
  return user;
}

export async function getProfiles(userId: string) {
  const profiles = await prisma.vpnProfile.findMany({
    where: { userId },
  });
  return profiles;
}

export async function createProfile(userId: string) {
  const userPlan = await prisma.userPlan.findFirst({
    where: { userId, active: true },
    include: { plan: true },
  });

  if (!userPlan) throw new Error("No active subscription");
  const profileCount = await prisma.vpnProfile.count({
    where: { userPlanId: userPlan.id },
  });

  if (profileCount >= userPlan.plan.slots)
    throw new Error("No slots avaliable");
  const servers = await prisma.server.findMany({
    where: { active: true, type: "xui" },
  });
  if (servers.length === 0) throw new Error("No servers avaliable!");

  const subscriptionToken = crypto.randomUUID();
  const profile = await prisma.vpnProfile.create({
    data: {
      userId,
      userPlanId: userPlan.id,
      slotNumber: profileCount + 1,
      protocol: "vless",
      subscriptionToken: subscriptionToken,
      expiresAt: userPlan.expiresAt,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found");

  for (const server of servers) {
    if (!server.inboundId) continue;
    const client = await createClient(
      user.email + "_" + (profileCount + 1),
      userPlan.plan.duration,
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
  }
  return profile;
}

export async function deleteProfile(userId: string, profileId: string) {
  const profile = await prisma.vpnProfile.findUnique({
    where: { id: profileId },
    include: {
      serverLinks: {
        include: { server: true },
      },
    },
  });
  if (!profile) throw new Error("Profile not found");
  if (profile.userId !== userId) throw new Error("Forbidden");
  for (const link of profile.serverLinks)
    await deleteClient(
      link.server as XuiServer,
      link.remoteId,
      link.server.inboundId!,
    );
  await prisma.profileServerLink.deleteMany({ where: { profileId } });
  await prisma.vpnProfile.delete({
    where: { id: profileId },
  });
}

export async function getSubscription(token: string) {
  const profile = await prisma.vpnProfile.findFirst({
    where: { subscriptionToken: token },
    include: {
      serverLinks: {
        include: { server: true },
      },
    },
  });
  if (!profile) throw new Error("Profile not found");

  const links = [];
  for (const link of profile.serverLinks) {
    const subLink = await axios.get(
      link.server.xuiSubUrl + "/sub/" + link.subId,
      {
        httpsAgent,
      },
    );
    const decoded = Buffer.from(subLink.data, "base64").toString("utf-8");
    const lines = decoded.split("\n").filter(Boolean);
    links.push(...lines);
  }
  const finalLink = Buffer.from(links.join("\n")).toString("base64");
  return finalLink;
}
