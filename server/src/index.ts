import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import aiRouter from "./routes/ai";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);

app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/ai", aiRouter);

// Global async error handler — catches thrown errors from all routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
