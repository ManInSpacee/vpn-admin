import { Router } from "express";
import { asyncHandler } from "../utils/helpers.js";
import authJwt from "../middleware/authJwt.js";
import { prisma } from "../lib/prisma.js";
import {
  createProfile,
  deleteProfile,
  getMe,
  getProfiles,
} from "../services/user.service.js";

const userRouter = Router();
userRouter.use(authJwt);

userRouter.get(
  "/me",
  asyncHandler(async (req: any, res: any) => {
    const user = await getMe(req.userId);
    res.status(200).json({ email: user?.email, createdAt: user?.createdAt });
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
    const profile = await createProfile(req.userId);
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

export default userRouter;
