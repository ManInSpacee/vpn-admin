import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { sendVerificationEmail } from "./email.service.js";

interface PendingRegistration {
  code: string;
  passwordHash: string;
  expiresAt: Date;
  sentAt: Date;
}
const pendingRegistrations = new Map<string, PendingRegistration>();

function validateEmail(email: string): void {
  if (!email) throw Object.assign(new Error("Введите email"), { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Object.assign(new Error("Некорректный формат email"), { status: 400 });
}

function validatePassword(password: string): void {
  if (!password) throw Object.assign(new Error("Введите пароль"), { status: 400 });
  if (password.length < 8) throw Object.assign(new Error("Минимум 8 символов"), { status: 400 });
  if (password.length > 128) throw Object.assign(new Error("Максимум 128 символов"), { status: 400 });
  if (!/[A-Z]/.test(password)) throw Object.assign(new Error("Нужна хотя бы одна заглавная буква"), { status: 400 });
  if (!/[0-9]/.test(password)) throw Object.assign(new Error("Нужна хотя бы одна цифра"), { status: 400 });
  if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(password))
    throw Object.assign(new Error("Нужен хотя бы один спецсимвол"), { status: 400 });
}

export async function registerUser(email: string, password: string) {
  validateEmail(email);
  validatePassword(password);
  
  const existing = await prisma.user.findUnique({ where: {email}});
  if (existing) throw Object.assign(new Error("Email уже занят"), {status: 409});
 
  const passwordHash = await bcrypt.hash(password, 10);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();

  pendingRegistrations.set(email, {
    code,
    passwordHash,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    sentAt: now,
  });

  console.log(`[DEBUG] verify code for ${email}: ${code}`);
  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("[email] failed to send:", err);
  }
}

export async function verifyCode(email: string, code: string) {
  const pending = pendingRegistrations.get(email);
  if (!pending || pending.code !== code || new Date() > pending.expiresAt)
    throw Object.assign(new Error("Неверный код"), {status: 400});

  const user = await prisma.user.create({
    data: { email, password_hash: pending.passwordHash },
  });

  pendingRegistrations.delete(email);
  return user;
}

export async function resendCode(email: string) {
  const pending = pendingRegistrations.get(email);
  if (pending) {
    const cooldown = 90 * 1000;
    const secondsLeft = Math.ceil((cooldown - (new Date().getTime() - pending.sentAt.getTime())) / 1000);
    if(new Date().getTime() - pending.sentAt.getTime() < cooldown)
      throw Object.assign(new Error(`Подождите ${secondsLeft} секунд`), {status: 429});
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();

  pendingRegistrations.set(email, {
    code,
    passwordHash: pending?.passwordHash ?? "",
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    sentAt: now,
  });

  await sendVerificationEmail(email, code);
}

export async function loginUser(email: string, password: string) {
  const currentUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!currentUser || !(await bcrypt.compare(password, currentUser.password_hash)))
    throw Object.assign(new Error("Неверный email или пароль"), { status: 401 });
  const accessToken = jwt.sign(
    { userId: currentUser.id },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "15m" },
  );
  const refreshToken = jwt.sign(
    { userId: currentUser.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken };
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (!(await bcrypt.compare(oldPassword, user.password_hash)))
    throw Object.assign(new Error("Неверный текущий пароль"), { status: 400 });
  validatePassword(newPassword);
  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: newHash },
  });
}

export async function refreshTokens(refreshToken: string) {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!,
    ) as { userId: string };

    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "15m" },
    );
    return { newAccessToken };
  } catch {
    const err: any = new Error("Invalid refresh token");
    err.status = 401;
    throw err;
  }
}
