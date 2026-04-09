import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import authJwt from "../middleware/authJwt.js";
import {
  createProfile,
  deleteProfile,
  getMe,
  getProfiles,
} from "../services/user.service.js";
import { changePassword } from "../services/auth.service.js";
import { prisma } from "../lib/prisma.js";

const userRouter = Router();
userRouter.use(authJwt);

userRouter.get(
  "/me",
  asyncHandler(async (req: any, res: any) => {
    const user = await getMe(req.userId);
    const activePlan = user?.userPlans[0];
    res.status(200).json({
      email: user?.email,
      createdAt: user?.createdAt,
      plan: activePlan
        ? { active: activePlan.plan.active, expiresAt: activePlan.expiresAt }
        : null,
    });
  }),
);

userRouter.get(
  "/profiles",
  asyncHandler(async (req: any, res: any) => {
    const profiles = await getProfiles(req.userId);
    res.status(200).json({ profiles });
  }),
);

userRouter.post(
  "/profiles",
  asyncHandler(async (req: any, res: any) => {
    const profile = await createProfile(req.userId, req.body.name);
    res.status(201).json({ profile });
  }),
);

userRouter.delete(
  "/profiles/:id",
  asyncHandler(async (req: any, res: any) => {
    await deleteProfile(req.userId, req.params.id);
    res.status(200).json({ ok: true });
  }),
);

userRouter.put(
  "/me/password",
  asyncHandler(async (req: any, res: any) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res
        .status(400)
        .json({ error: "old password and new Password are required" });
    await changePassword(req.userId, oldPassword, newPassword);
    res.status(200).json({ ok: true });
  }),
);

userRouter.get(
  "/plans",
  asyncHandler(async (_req: any, res: any) => {
    const plans = await prisma.plan.findMany({ where: { active: true } });
    res.status(200).json({ plans });
  }),
);

export default userRouter;
