const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request("/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/sign-out", { method: "POST" }),
  me: () => request("/auth/get-session"),

  // Users
  getUsers: () => request("/users"),
  createUser: (data: { email: string; name: string; password: string }) =>
    request("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<{ name: string; email: string; password: string }>) =>
    request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: "DELETE" }),

  // Tickets
  getTickets: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/tickets${qs}`);
  },
  getTicket: (id: string) => request(`/tickets/${id}`),
  createTicket: (data: {
    subject: string;
    body: string;
    fromEmail: string;
    fromName: string;
  }) => request("/tickets", { method: "POST", body: JSON.stringify(data) }),
  updateTicket: (
    id: string,
    data: Partial<{
      status: string;
      category: string;
      assignedToId: string | null;
    }>
  ) => request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // AI
  classifyTicket: (ticketId: string) =>
    request(`/ai/classify/${ticketId}`, { method: "POST" }),
  summarizeTicket: (ticketId: string) =>
    request(`/ai/summarize/${ticketId}`, { method: "POST" }),
  suggestReply: (ticketId: string) =>
    request(`/ai/suggest-reply/${ticketId}`, { method: "POST" }),
};
