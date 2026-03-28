import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// GET /api/users — admin only
router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// POST /api/users — admin only (create agent)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    res.status(400).json({ error: "email, name, and password are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const result = await auth.api.signUpEmail({ body: { email, name, password } });
  const user = await prisma.user.update({
    where: { id: result.user.id },
    data: { role: "AGENT" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  res.status(201).json(user);
});

// PATCH /api/users/:id — admin only
router.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const { name, email } = req.body;

  const data: Record<string, string> = {};
  if (name) data.name = name;
  if (email) data.email = email;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  res.json(user);
});

// DELETE /api/users/:id — admin only
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
