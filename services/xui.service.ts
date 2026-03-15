import "dotenv/config";
import https from "node:https";
import axios from "axios";
import { getDays, formatBytes } from "../utils/helpers.js";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const api = axios.create({ baseURL: process.env["XUI_URL"], httpsAgent });

async function login() {
  const res = await api.post("/login", {
    username: process.env["XUI_USERNAME"],
    password: process.env["XUI_PASSWORD"],
  });

  const setCookie = res.headers["set-cookie"]?.[0];
  if (setCookie) {
    api.defaults.headers.Cookie = setCookie.split(";")[0];
  }
}

async function fetchAllClients() {
  const { data } = await api.get("/panel/api/inbounds/list");
  const clients = data.obj.flatMap((inbound: any) =>
    inbound.clientStats.map((client: any) => ({
      ...client,
      inbound: inbound.remark,
    })),
  );
  return clients;
}

async function fetchFormattedClients() {
  return (await fetchAllClients()).map((client: any) => ({
    email: client.email,
    inbound: client.inbound,
    enable: client.enable,
    upMb: formatBytes(client.up),
    downMb: formatBytes(client.down),
  }));
}

async function createClient(email: string, plan: string) {
  const expiryTime = Date.now() + getDays(plan) * 24 * 60 * 60 * 1000;
  const uuid = crypto.randomUUID();
  const subId = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const client = {
    id: uuid,
    email,
    enable: true,
    expiryTime,
    totalGB: 0,
    limitIp: 0,
    flow: "xtls-rprx-vision",
    subId,
    reset: 0,
    tgId: 0,
    comment: "",
  };

  await api.post("/panel/api/inbounds/addClient", {
    id: 9,
    settings: JSON.stringify({ clients: [client] }),
  });
  return {
    email,
    plan,
    subscriptionUrl: `${process.env.XUI_SUB_URL}/sub/${subId}`,
  };
}

async function fetchInbounds() {
  const { data } = await api.get("/panel/api/inbounds/list");
  return data.obj;
}

export {
  login,
  fetchAllClients,
  createClient,
  fetchInbounds,
  fetchFormattedClients,
};
