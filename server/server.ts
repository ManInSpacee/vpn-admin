import "dotenv/config"
import https from "node:https"
import express from "express"
import axios from "axios"

const app = express()
app.use(express.json())

const PORT = 3000

// Панель на self-signed сертификате — отключаем проверку
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

// axios.create() — создаёт экземпляр с базовыми настройками
// Все запросы через api автоматически идут на XUI_URL
const api = axios.create({
  baseURL: process.env["XUI_URL"],
  httpsAgent,
})

// ─── Авторизация ─────────────────────────────────────────────────────────────

async function login() {
  const res = await api.post("/login", {
    username: process.env["XUI_USERNAME"],
    password: process.env["XUI_PASSWORD"],
  })

  // Достаём куку из ответа и вшиваем в заголовки всех следующих запросов
  const setCookie = res.headers["set-cookie"]?.[0]
  if (setCookie) {
    api.defaults.headers.Cookie = setCookie.split(";")[0]
  }
}
// ─── Tools ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

async function fetchAllClients() {
  const { data } = await api.get('/panel/api/inbounds/list');
  const clients = data.obj.flatMap((inbound: any) => inbound.clientStats
    .map((client: any) => ({...client, inbound: inbound.remark})));
  return clients;
}

function getDays(plan: string): number {
  if (plan === "1m") return 30; 
  if (plan === "3m") return 90; 
  if (plan === "12m") return 360;
  return 30;
}

// ─── Роуты ───────────────────────────────────────────────────────────────────

app.get("/inbounds", async (_req, res) => {
  const { data } = await api.get("/panel/api/inbounds/list");
  res.json(data.obj)
})

app.get('/clients', async (_req, res) => {
  const clients = (await fetchAllClients()).map((client: any) => ({
      email: client.email,
      inbound: client.inbound,
      enable: client.enable,
      upMb: formatBytes(client.up),
      downMb: formatBytes(client.down),
    }))
  return res.status(200).json({clients});
})

app.get('/clients/:email', async (req, res) => {
  try {
    const clients = await fetchAllClients();
    const client = clients.find((u: any) => u.email === req.params.email);
    
    if (!client) return res.status(404).json({error: "User not found"})
    res.status(200).json({client})
  } catch (e) {
    res.status(500).json({error: "Панель недоступна"});
  }
})

app.post('/clients', async (req, res) => {
  try {
    const { email, plan } = req.body;
    const expiryTime = Date.now() + getDays(plan) * 24 * 60 * 60 * 1000;
    const uuid = crypto.randomUUID();
    const subId = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
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
    comment: ""
    }

    await api.post('/panel/api/inbounds/addClient', {
      id: 9,  // пока хардкодим inboundId
      settings: JSON.stringify({ clients: [client] })
    })
    return res.status(201).json({
      email, 
      plan,
      subscriptionUrl: `${process.env.XUI_SUB_URL}/sub/${subId}`
    })
  } catch (err: any) {
    return res.status(500).json(`error: ${err.response?.data ?? err.message}`)
  }

})


// ─── Запуск ──────────────────────────────────────────────────────────────────

await login()
app.listen(PORT, () => console.log(`http://localhost:${PORT}`))
