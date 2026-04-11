import { Router } from "express";
import {
  loginUser,
  refreshTokens,
  registerUser,
  verifyCode,
  resendCode,
} from "../services/auth.service.js";
import { asyncHandler } from "../utils/helpers.js";
import { auth } from "../middleware/auth.js";

const authRouter = Router();

authRouter.post(
  "/auth/register",
  asyncHandler(async (req: any, res: any) => {
    const user = await registerUser(req.body.email, req.body.password);
    res.status(201).json({ user });
  }),
);
authRouter.post(
  "/auth/verify-code",
  asyncHandler(async (req: any, res: any) => {
    await verifyCode(req.body.email, req.body.code);
    res.status(200).json({ok: true});
  }),
);

authRouter.post(
  "/auth/resend-code",
  asyncHandler(async (req: any, res: any) => {
    await resendCode(req.body.email);
    res.status(200).json({ok: true});
  }),
);

authRouter.post(
  "/auth/login",
  asyncHandler(async (req: any, res: any) => {
    const { accessToken, refreshToken } = await loginUser(
      req.body.email,
      req.body.password,
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ ok: true });
  }),
);

authRouter.post(
  "/auth/refresh",
  asyncHandler(async (req: any, res: any) => {
    const token = req.cookies.refreshToken;
    const { newAccessToken } = await refreshTokens(token);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ ok: true });
  }),
);

authRouter.post(
  "/auth/logout",
  asyncHandler(async (req: any, res: any) => {
    res.cookie("accessToken", "", { httpOnly: true, maxAge: 0 });
    res.cookie("refreshToken", "", { httpOnly: true, maxAge: 0 });
    res.status(200).json({ ok: true });
  }),
);

export default authRouter;
