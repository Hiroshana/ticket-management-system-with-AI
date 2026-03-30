import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { TicketStatus, TicketCategory } from "../generated/prisma";

const router = Router();

// GET /api/tickets
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { status, category, sortBy = "createdAt", order = "desc" } = req.query;

  const ALLOWED_SORT_FIELDS = ["createdAt", "updatedAt", "subject", "status", "category"] as const;
  const ALLOWED_ORDER_VALUES = ["asc", "desc"] as const;

  const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy as (typeof ALLOWED_SORT_FIELDS)[number])
    ? (sortBy as string)
    : "createdAt";
  const safeOrder = ALLOWED_ORDER_VALUES.includes(order as (typeof ALLOWED_ORDER_VALUES)[number])
    ? (order as "asc" | "desc")
    : "desc";

  const where: Record<string, unknown> = {};
  if (status) where.status = status as TicketStatus;
  if (category) where.category = category as TicketCategory;

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { [safeSortBy]: safeOrder },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(tickets);
});

// GET /api/tickets/:id
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(ticket);
});

// POST /api/tickets
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const { subject, body, fromEmail, fromName } = req.body;

  if (!subject || !body || !fromEmail || !fromName) {
    res.status(400).json({ error: "subject, body, fromEmail, and fromName are required" });
    return;
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      body,
      fromEmail,
      fromName,
      createdById: req.user?.id,
    },
  });
  res.status(201).json(ticket);
});

// PATCH /api/tickets/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const { status, category, assignedToId, aiSummary, aiReply } = req.body;

  const data: Record<string, unknown> = {};
  if (status) data.status = status as TicketStatus;
  if (category !== undefined) data.category = category as TicketCategory;

  // Admin-only fields
  if (assignedToId !== undefined || aiSummary !== undefined || aiReply !== undefined) {
    if (req.user?.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (assignedToId !== undefined) data.assignedToId = assignedToId;
    if (aiSummary !== undefined) data.aiSummary = aiSummary;
    if (aiReply !== undefined) data.aiReply = aiReply;
  }

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(ticket);
});

export default router;
