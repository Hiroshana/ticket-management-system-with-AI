export type Role = "ADMIN" | "AGENT";
export type TicketStatus = "OPEN" | "RESOLVED" | "CLOSED";
export type TicketCategory =
  | "GENERAL_QUESTION"
  | "TECHNICAL_QUESTION"
  | "REFUND_REQUEST";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  status: TicketStatus;
  category: TicketCategory | null;
  aiSummary: string | null;
  aiReply: string | null;
  assignedTo: Pick<User, "id" | "name" | "email"> | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
}
