import "express-session";
import { Role } from "../generated/prisma";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: Role;
  }
}
