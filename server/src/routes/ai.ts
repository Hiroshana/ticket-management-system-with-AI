import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { TicketCategory } from "../generated/prisma";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIES: TicketCategory[] = [
  "GENERAL_QUESTION",
  "TECHNICAL_QUESTION",
  "REFUND_REQUEST",
];

// POST /api/ai/classify/:ticketId
router.post("/classify/:ticketId", requireAuth, async (req: Request, res: Response) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: `Classify the following support ticket into exactly one of these categories: GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST.

Subject: ${ticket.subject}
Body: ${ticket.body}

Reply with only the category name, nothing else.`,
      },
    ],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim().toUpperCase();
  const category = CATEGORIES.find((c) => c === raw) ?? "GENERAL_QUESTION";

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { category },
  });

  res.json({ category: updated.category });
});

// POST /api/ai/summarize/:ticketId
router.post("/summarize/:ticketId", requireAuth, async (req: Request, res: Response) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Summarize this support ticket in 1-2 sentences:

Subject: ${ticket.subject}
From: ${ticket.fromName} <${ticket.fromEmail}>
Body: ${ticket.body}`,
      },
    ],
  });

  const aiSummary = (message.content[0] as { type: string; text: string }).text.trim();
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { aiSummary },
  });

  res.json({ aiSummary: updated.aiSummary });
});

// POST /api/ai/suggest-reply/:ticketId
router.post("/suggest-reply/:ticketId", requireAuth, async (req: Request, res: Response) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  // Fetch relevant knowledge base articles
  const kbArticles = await prisma.knowledgeBase.findMany({
    where: ticket.category ? { category: ticket.category } : {},
    take: 3,
  });

  const kbContext = kbArticles.length
    ? kbArticles.map((a) => `${a.title}:\n${a.content}`).join("\n\n")
    : "No specific knowledge base articles available.";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are a helpful support agent. Write a professional, empathetic reply to this support ticket.

Knowledge Base:
${kbContext}

Ticket:
Subject: ${ticket.subject}
From: ${ticket.fromName}
Body: ${ticket.body}

Write only the reply body, no subject line.`,
      },
    ],
  });

  const aiReply = (message.content[0] as { type: string; text: string }).text.trim();
  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { aiReply },
  });

  res.json({ aiReply: updated.aiReply });
});

export default router;
