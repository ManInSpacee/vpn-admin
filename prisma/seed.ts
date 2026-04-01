import "dotenv/config";
import { prisma } from "../lib/prisma.js";

// const plan = await prisma.plan.create({
//   data: {
//     name: "Базовый",
//     duration: 30,
//     price: 120,
//     slots: 5,
//   },
// });

// const server = await prisma.server.create({
//   data: {
//     name: "Germany",
//     country: "DE",
//     host: "82.25.39.117",
//     type: "xui",
//     xuiSubUrl: "https://82.25.39.117:2096",
//     xuiUrl: "https://82.25.39.117:29089/q1USkKhyBAuhruhXkT",
//     xuiUsername: "N3o4nLmOU0",
//     xuiPassword: "TvGd5epRFi",
//     maxClients: 100,
//     inboundId: 1,
//   },
// });

// const server2 = await prisma.server.create({
//   data: {
//     name: "Netherlands",
//     country: "NL",
//     host: "31.207.47.243",
//     type: "xui",
//     xuiSubUrl: "https://31.207.47.243:2096",
//     xuiUrl: "https://31.207.47.243:40175/REXr9IvtJTyfxcO9El",
//     xuiUsername: "3Wl0mhJzCj",
//     xuiPassword: "6pdmR3rqEs",
//     maxClients: 100,
//     inboundId: 9,
//   },
// });

// XUI_URL=https://31.207.47.243:40175/REXr9IvtJTyfxcO9El
// XUI_USERNAME=3Wl0mhJzCj
// XUI_PASSWORD=6pdmR3rqEs
// XUI_SUB_URL=https://31.207.47.243:2096
// API_KEY=7d64d5d690d5b0be18500a3e9b605fe59ab9a30f018a0f5cdedf88e060c4baec
// CORS_ORIGIN=http://localhost:5173
// JWT_ACCESS_SECRET=181f4fa691f5445e55987dd42041413a46eae8e48088360667393ad2ba1476c568da333d7c2f6a7c407101acaadb70a75d36084109abd682471d3e76d9c0e3ef
// JWT_REFRESH_SECRET=60a5eb55e9815349d8ed127398d69674398b80188d004fed4e1a4bc131f61aa5c3b2fc39f6a74a6dac82c77cf20298cd5dd4096f5aa96f440c44af0a22d2a8a9

// const userPlan = await prisma.userPlan.create({
//   data: {
//     userId: "вставить свой",
//     planId: "вставить свой",
//     startsAt: new Date(),
//     expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//     active: true,
//     autoRenew: true,
//   },
// });

// console.log("Seeded:", { userPlan });
// await prisma.$disconnect();
