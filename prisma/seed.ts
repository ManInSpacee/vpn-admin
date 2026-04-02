import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const plan = await prisma.plan.upsert({
  where: { id: "plan-basic-001" },
  update: {},
  create: {
    id: "plan-basic-001",
    name: "Базовый",
    duration: 30,
    price: 200,
    slots: 5,
  },
});

const serverNL = await prisma.server.upsert({
  where: { id: "server-nl-001" },
  update: {},
  create: {
    id: "server-nl-001",
    name: "Netherlands",
    country: "NL",
    host: process.env.XUI_NL_HOST!,
    type: "xui",
    xuiUrl: process.env.XUI_NL_URL!,
    xuiSubUrl: process.env.XUI_NL_SUB_URL!,
    xuiUsername: process.env.XUI_NL_USERNAME!,
    xuiPassword: process.env.XUI_NL_PASSWORD!,
    inboundId: Number(process.env.XUI_NL_INBOUND_ID),
    maxClients: 100,
  },
});

const serverDE = await prisma.server.upsert({
  where: { id: "server-de-001" },
  update: {},
  create: {
    id: "server-de-001",
    name: "Germany",
    country: "DE",
    host: process.env.XUI_DE_HOST!,
    type: "xui",
    xuiUrl: process.env.XUI_DE_URL!,
    xuiSubUrl: process.env.XUI_DE_SUB_URL!,
    xuiUsername: process.env.XUI_DE_USERNAME!,
    xuiPassword: process.env.XUI_DE_PASSWORD!,
    inboundId: Number(process.env.XUI_DE_INBOUND_ID),
    maxClients: 100,
  },
});

console.log("Seeded:", { plan, serverNL, serverDE });
await prisma.$disconnect();
