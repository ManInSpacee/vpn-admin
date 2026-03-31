import "dotenv/config";
import https from "node:https";
import axios from "axios";
import { formatBytes } from "../utils/helpers.js";

export type XuiServer = {
  xuiUrl: string;
  xuiUsername: string;
  xuiPassword: string;
};

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

async function createServerApi(server: XuiServer) {
  const serverApi = axios.create({ baseURL: server.xuiUrl, httpsAgent });
  const loginRes = await serverApi.post("/login", {
    username: server.xuiUsername,
    password: server.xuiPassword,
  });
  const cookie = loginRes.headers["set-cookie"]?.[0]?.split(";")[0];
  if (cookie) serverApi.defaults.headers.Cookie = cookie;
  return serverApi;
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
  const { data } = await api.get("/panel/api/inbounds/list");
  const inbound = data.obj.find((i: any) => i.id === 9);
  if (!inbound) return [];
  return inbound.clientStats.map((client: any) => ({
    email: client.email,
    enable: client.enable,
    expiryTime: client.expiryTime,
    upMb: formatBytes(client.up),
    downMb: formatBytes(client.down),
  }));
}

async function createClient(
  email: string,
  plan: number,
  server: XuiServer,
  inboundId: number,
) {
  const serverApi = await createServerApi(server);
  const expiryTime = Date.now() + plan * 24 * 60 * 60 * 1000;
  const clientUuid = crypto.randomUUID();
  const subId = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const client = {
    id: clientUuid,
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

  await serverApi.post("/panel/api/inbounds/addClient", {
    id: inboundId,
    settings: JSON.stringify({ clients: [client] }),
  });
  return {
    email,
    plan,
    subId,
    clientUuid,
  };
}

async function deleteClient(
  server: XuiServer,
  clientUuid: string,
  inboundId: number,
) {
  const serverApi = createServerApi(server);
  await (
    await serverApi
  ).post(`/panel/api/inbounds/${inboundId}/delClient/${clientUuid}`);
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
  deleteClient,
};
