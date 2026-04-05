import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

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
  const hashPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashPassword,
      },
    });
    return user;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const e: any = new Error("Email уже занят");
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

export async function loginUser(email: string, password: string) {
  const currentUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!currentUser) {
    const err: any = new Error("Пользователь не найден");
    err.status = 401;
    throw err;
  }
  if (!password) throw Object.assign(new Error("Введите пароль"), { status: 401 });
  if (!(await bcrypt.compare(password, currentUser.password_hash)))
    throw Object.assign(new Error("Неправильный пароль"), { status: 401 });
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
