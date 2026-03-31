import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export async function registerUser(email: string, password: string) {
  const hashPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password_hash: hashPassword,
    },
  });
  return user;
}

export async function loginUser(email: string, password: string) {
  const currentUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!currentUser) throw new Error("User not found");
  if (!password) throw new Error("Enter a password");
  if (!(await bcrypt.compare(password, currentUser.password_hash)))
    throw new Error("Invalid password");
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
    throw new Error("Invalid refresh token");
  }
}
