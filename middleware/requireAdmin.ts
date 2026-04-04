import { prisma } from "../lib/prisma.js";

async function requireAdmin(req: any, res: any, next: any) {
  try {
    const userUuid = req.userId;
    const user = await prisma.user.findUnique({
      where: { id: userUuid, role: "admin" },
    });
    if (!user)
      return res.status(404).json({ error: "You don't have permission" });
    next();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

export default requireAdmin;
