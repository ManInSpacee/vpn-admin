# VPN Project -- полный контекст для разработки

**Дата:** 2026-03-31
**Автор контекста:** Клим (бэкенд, БД, фронтенды)
**Напарник:** AWG-агент (HTTP-сервис для AmneziaWG)
**Тимлид:** Витя (инфраструктура, деплой)

---

## 1. Что это за проект

VPN-сервис с личным кабинетом, админкой и подписочной моделью.
Пользователь покупает подписку (~200 руб/мес) и получает 5 слотов.
Каждый слот = 1 VPN профиль, который автоматически разворачивается на ВСЕХ активных серверах.
Один URL подписки (`/sub/:token`) -- клиент вставляет его в VPN-приложение (Hiddify, Happ, v2rayNG) и получает все локации сразу.

**Протоколы:**
- **VLESS** (через x-ui3 панели) -- сейчас работает
- **AmneziaWG** -- напарник делает параллельно, пока не интегрировано

---

## 2. Структура проекта

```
VPN/
  backend/              <-- основной бэкенд (TypeScript + Express + Prisma)
  admin-frontend/       <-- React + Tailwind админка (существует, базовая)
  prisma-practice/      <-- учебный проект Prisma (не продакшен)
```

### Git репозитории
- backend -> http://146.0.77.15:81/backends/main-backend.git (ветка dev -> main)
- admin-frontend -> http://146.0.77.15:81/frontends/admin.git (ветка main)

### Деплой
- Dokploy на VPS 151.241.215.235
- backend: порт 3003
- admin-frontend: порт 3004 (nginx)

---

## 3. Стек

- **Runtime:** Node.js 22, TypeScript, ESM
- **Фреймворк:** Express 5
- **БД:** PostgreSQL (Docker), Prisma 7 (с адаптером @prisma/adapter-pg)
- **HTTP клиент:** Axios (self-signed сертификаты -> httpsAgent)
- **Авторизация пользователей:** JWT (access 15 мин + refresh 7 дней) в httpOnly куках, bcrypt для паролей
- **Авторизация админки:** API key через заголовок x-api-key
- **Фронтенды:** React + Tailwind
- **Деплой:** Docker, Dokploy

---

## 4. Серверы (VPS с x-ui3)

| Имя | Страна | IP | Порт панели | Порт подписок | inboundId |
|-----|--------|-----|------------|---------------|-----------|
| Netherlands | NL | 31.207.47.243 | 40175 | 2096 | 9 |
| Germany | DE | 82.25.39.117 | 29089 | (настроить) | 1 |

Каждый сервер -- отдельная инсталляция x-ui3 со своими credentials.
Данные хранятся в таблице `Server` в БД.

---

## 5. Схема БД (Prisma)

```
User
  |-- UserPlan (подписка, связана с Plan)
  |     |-- VpnProfile (слот, 1-5 на подписку)
  |           |-- ProfileServerLink (связь профиля с каждым сервером)
  |           |     |-- Server
  |           |-- ProfileStat (статистика трафика)
  |-- Payment

Plan (тарифы: name, duration, price, slots)
Server (VPS: name, country, host, xuiUrl, xuiUsername, xuiPassword, xuiSubUrl, inboundId, ...)
```

### Ключевые модели

**User** -- email (unique), password_hash, telegramId (опц.), createdAt

**UserPlan** -- userId, planId, startsAt, expiresAt, active, autoRenew

**Plan** -- name, duration (дни), price (руб), slots (кол-во слотов)

**Server** -- name, country, host, type (xui|awg|both), xuiUrl?, xuiUsername?, xuiPassword?, xuiSubUrl?, inboundId?, agentUrl?, agentKey?, maxClients, active

**VpnProfile** -- userId, userPlanId, slotNumber, protocol (vless|awg), subscriptionToken?, expiresAt, serverId? (legacy, не используется)

**ProfileServerLink** -- profileId, serverId, subId (ID подписки в x-ui3), remoteId (UUID клиента в x-ui3)

**ProfileStat** -- profileId, serverId?, recordedAt, rxBytes, txBytes

**Payment** -- userId, userPlanId, amount, status, provider, providerId

### Enums
- ServerType: xui, awg, both
- Protocol: vless, awg

---

## 6. Архитектура бэкенда

### Файловая структура

```
backend/
  server.ts                    -- точка входа, Express app, подключение роутеров
  lib/prisma.ts                -- экспорт PrismaClient
  middleware/
    auth.ts                    -- проверка API key (x-api-key) для админки
    authJwt.ts                 -- проверка JWT из httpOnly куки для ЛК
  routes/
    client.routes.ts           -- админские роуты (защищены auth middleware)
    auth.routes.ts             -- регистрация, логин, refresh, logout (публичные)
    user.routes.ts             -- ЛК роуты (защищены authJwt middleware)
    sub.routes.ts              -- подписки (публичный, БЕЗ авторизации)
  services/
    xui.service.ts             -- работа с x-ui3 API (создание/удаление клиентов)
    auth.service.ts            -- регистрация, логин, refresh токенов
    user.service.ts            -- бизнес-логика ЛК (профили, подписки)
  utils/helpers.ts             -- formatBytes, asyncHandler
  prisma/
    schema.prisma              -- схема БД
    seed.ts                    -- начальные данные
```

### Порядок middleware в server.ts

```
1. cors
2. express.json()
3. cookieParser()
4. subRouter          <-- ПЕРВЫЙ! (публичный, без авторизации)
5. clientRouter       <-- auth middleware (API key) внутри роутера
6. authRouter         <-- публичный (регистрация/логин)
7. userRouter         <-- authJwt middleware внутри роутера
8. error handler
```

**ВАЖНО:** subRouter ДОЛЖЕН быть перед clientRouter, иначе auth middleware из clientRouter перехватывает запросы к /sub/:token.

---

## 7. API эндпоинты

### Публичные (без авторизации)
| Метод | URL | Описание |
|-------|-----|----------|
| POST | /register | Регистрация (email, password) |
| POST | /login | Логин, устанавливает JWT в куки |
| POST | /refresh | Обновление access токена |
| POST | /logout | Очистка кук |
| GET | /sub/:token | Агрегированная подписка (base64) |

### Защищенные JWT (ЛК)
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /me | Данные пользователя |
| GET | /profiles | Список VPN профилей пользователя |
| POST | /profiles | Создать новый профиль (на всех серверах) |
| DELETE | /profiles/:id | Удалить профиль (со всех серверов) |

### Защищенные API key (админка)
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /auth | Проверка API ключа |
| GET | /inbounds | Список инбаундов x-ui3 |
| GET | /clients | Список клиентов (форматированный) |
| GET | /clients/:email | Клиент по email |
| POST | /clients | Создать клиента (старый API, без БД) |

---

## 8. Как работает создание профиля (createProfile)

1. Проверяем что у пользователя есть активный `UserPlan`
2. Считаем существующие профили, проверяем лимит слотов
3. Берем ВСЕ активные xui-серверы из БД (`findMany`)
4. Создаем `VpnProfile` с уникальным `subscriptionToken` (UUID)
5. Для КАЖДОГО сервера:
   - Пропускаем если нет `inboundId`
   - Вызываем `createClient()` в xui.service.ts -- создает клиента в x-ui3
   - Сохраняем `ProfileServerLink` с `subId` и `remoteId` (clientUuid)

### createClient (xui.service.ts)
- Создает axios инстанс для конкретного сервера (`createServerApi`)
- Логинится в x-ui3 панель, сохраняет cookie
- Генерирует `clientUuid` (UUID) и `subId` (16 символов hex)
- POST `/panel/api/inbounds/addClient` с настройками VLESS клиента
- Возвращает `{ subId, clientUuid }`

---

## 9. Как работает удаление профиля (deleteProfile)

1. Находим профиль с `include: { serverLinks: { include: { server: true } } }`
2. Проверяем ownership (userId)
3. Для каждого `serverLink`:
   - Вызываем `deleteClient(server, remoteId, inboundId)` -- удаляет из x-ui3
4. Удаляем все `ProfileServerLink` записи (`deleteMany`)
5. Удаляем сам `VpnProfile`

**ВАЖНО:** Нет каскадного удаления в схеме. Сначала удаляем serverLinks, потом профиль, иначе foreign key constraint.

---

## 10. Как работает агрегатор подписок (getSubscription)

1. Находим `VpnProfile` по `subscriptionToken` (`findFirst`)
2. Берем все `serverLinks` с include server
3. Для каждого serverLink:
   - GET запрос к `server.xuiSubUrl + "/sub/" + link.subId`
   - x-ui3 возвращает base64 строку
   - Декодируем: `Buffer.from(data, "base64").toString("utf-8")`
   - Разбиваем по `\n`, фильтруем пустые строки
4. Объединяем все VLESS ссылки через `\n`
5. Кодируем обратно в base64
6. Отдаем как `text/plain`

Результат: пользователь вставляет один URL в VPN-приложение, получает все серверы.

---

## 11. Авторизация

### Для пользователей ЛК (JWT)
- POST /login -> bcrypt.compare пароля -> генерация access (15 мин) + refresh (7 дней) токенов
- Токены в httpOnly куках (не в localStorage!)
- authJwt middleware читает `req.cookies.accessToken`, верифицирует, ставит `req.userId`
- POST /refresh -> верификация refreshToken -> новый accessToken

### Для админки (API key)
- Заголовок `x-api-key` сравнивается с `process.env.API_KEY`
- auth middleware внутри clientRouter

---

## 12. Переменные окружения (.env)

```
XUI_URL=https://...          # URL панели x-ui3 (для старого API, adminка)
XUI_USERNAME=...              # Логин x-ui3
XUI_PASSWORD=...              # Пароль x-ui3
XUI_SUB_URL=https://...:port  # URL подписок x-ui3 (другой порт!)
API_KEY=...                   # Ключ для админки
CORS_ORIGIN=http://...        # Разрешенный origin для CORS
JWT_ACCESS_SECRET=...         # Секрет для access токена
JWT_REFRESH_SECRET=...        # Секрет для refresh токена
DATABASE_URL=postgresql://... # Подключение к PostgreSQL
```

---

## 13. Что сделано (по состоянию на 2026-03-31)

- [x] Схема БД в Prisma (все модели)
- [x] Регистрация/логин (JWT + bcrypt + httpOnly куки)
- [x] CRUD профилей (создание на ВСЕХ серверах, удаление со ВСЕХ)
- [x] Агрегатор подписок /sub/:token
- [x] Два сервера (NL + DE) подключены и работают
- [x] Админка (базовая): авторизация, список клиентов, создание

## 14. Что осталось

### Бэкенд (ближайшее)
- [ ] PUT /me/password -- смена пароля
- [ ] GET /me -- добавить тариф и дату окончания подписки
- [ ] Красивые названия серверов в VLESS ссылках (из Server.name)

### Фронт ЛК (следующий этап)
- [ ] React + Tailwind, бруталист/терминал стиль
- [ ] Авторизация (логин/регистрация)
- [ ] Статус подписки, список слотов
- [ ] Создание/удаление профилей
- [ ] Ссылка подписки / QR код
- [ ] Профиль (email, смена пароля)

### Позже
- [ ] Рефакторинг xui.service.ts в XUIAdapter с единым интерфейсом
- [ ] Интеграция AWG-агента (напарник)
- [ ] AWGAdapter в бэкенде
- [ ] Cron: проверка истечения подписок, сбор статистики
- [ ] Платежная система (YooKassa)
- [ ] Расширение админки (серверы, фильтрация, статистика)
- [ ] Транзакции в createProfile (сейчас если один сервер упадет -- профиль создастся без всех serverLinks)

---

## 15. Для напарника (AWG-агент)

### Что нужно от агента
HTTP-сервис на каждом сервере с AmneziaWG. Единый интерфейс:

```
POST   /peers          -- создать peer (вернуть config файл)
DELETE /peers/:id       -- удалить peer
GET    /peers           -- список peers
GET    /stats           -- статистика (rx/tx по peer)
```

### Как будет интегрировано
1. В таблице `Server` есть поля `agentUrl` и `agentKey` -- URL и ключ авторизации агента
2. Бэкенд будет вызывать агент через эти поля
3. Для AWG: 1 слот = 1 регион (не все серверы как у VLESS)
4. `ProfileServerLink` будет хранить конфиг (.conf) вместо subId
5. Бэкенд смотрит `server.type` и выбирает адаптер (XUI или AWG)

### Формат ответа агента (предложение)
```json
// POST /peers
{
  "id": "peer-uuid",
  "config": "[Interface]\nPrivateKey=...\n[Peer]\n..."
}

// GET /stats
{
  "peers": [
    { "id": "peer-uuid", "rx": 123456, "tx": 789012 }
  ]
}
```

### Авторизация агента
Заголовок с ключом (аналог x-api-key), ключ хранится в `Server.agentKey`.

---

## 16. Известные проблемы и нюансы

1. **Self-signed сертификаты** -- все запросы к x-ui3 через `httpsAgent` с `rejectUnauthorized: false`
2. **Старый API в xui.service.ts** -- `login()`, `fetchAllClients()`, `fetchFormattedClients()` используют глобальный `api` инстанс с env переменными (XUI_URL). Это для админки и работает только с одним сервером. Новый код (createClient, deleteClient) использует `createServerApi()` с данными из БД.
3. **subscriptionToken не @unique** -- используем `findFirst` вместо `findUnique`. Можно добавить `@unique` в схему.
4. **Нет каскадного удаления** -- при удалении профиля сначала вручную удаляем ProfileServerLink, потом сам профиль.
5. **Нет транзакций** -- createProfile не атомарный. Если создание на одном сервере упадет, профиль останется без части serverLinks.
6. **expiresAt не синхронизируется** -- если UserPlan.expiresAt меняется, существующие профили и клиенты в x-ui3 не обновляются.
7. **email клиента в x-ui3** -- формат `user_email_slotNumber` для уникальности.

---

## 17. Запуск проекта локально

```bash
# PostgreSQL через Docker
docker compose up -d

# Установка зависимостей
cd backend && npm install

# Prisma: генерация клиента и миграции
npx prisma migrate dev
npx prisma generate

# Начальные данные
npx tsx prisma/seed.ts

# Запуск в dev режиме
npm run dev        # -> http://localhost:3000

# Prisma Studio (GUI для БД)
npx prisma studio  # -> http://localhost:5555
```
