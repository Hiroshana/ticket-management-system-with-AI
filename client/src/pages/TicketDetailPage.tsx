import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Ticket, TicketStatus, TicketCategory, User } from "../types";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: "General Question",
  TECHNICAL_QUESTION: "Technical Question",
  REFUND_REQUEST: "Refund Request",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getTicket(id),
      user?.role === "ADMIN" ? api.getUsers() : Promise.resolve([]),
    ])
      .then(([t, u]) => {
        setTicket(t as Ticket);
        setAgents((u as User[]).filter((u) => u.role === "AGENT"));
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  async function handleStatusChange(status: TicketStatus) {
    if (!ticket) return;
    const updated = await api.updateTicket(ticket.id, { status });
    setTicket(updated as Ticket);
  }

  async function handleAssign(assignedToId: string) {
    if (!ticket) return;
    const updated = await api.updateTicket(ticket.id, {
      assignedToId: assignedToId || null,
    });
    setTicket(updated as Ticket);
  }

  async function handleAI(action: "classify" | "summarize" | "reply") {
    if (!ticket) return;
    setAiLoading(action);
    try {
      if (action === "classify") {
        const res = await api.classifyTicket(ticket.id);
        setTicket((prev) => prev ? { ...prev, category: (res as { category: TicketCategory }).category } : prev);
      } else if (action === "summarize") {
        const res = await api.summarizeTicket(ticket.id);
        setTicket((prev) => prev ? { ...prev, aiSummary: (res as { aiSummary: string }).aiSummary } : prev);
      } else {
        const res = await api.suggestReply(ticket.id);
        setTicket((prev) => prev ? { ...prev, aiReply: (res as { aiReply: string }).aiReply } : prev);
      }
    } finally {
      setAiLoading(null);
    }
  }

  if (loading) return <div className="p-8 text-gray-500 text-sm">Loading...</div>;
  if (!ticket) return <div className="p-8 text-gray-500 text-sm">Ticket not found.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 hover:underline mb-4 block"
      >
        ← Back to tickets
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
            {ticket.status}
          </span>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          From <span className="font-medium text-gray-700">{ticket.fromName}</span>{" "}
          &lt;{ticket.fromEmail}&gt; &middot;{" "}
          {new Date(ticket.createdAt).toLocaleString()}
        </div>

        <p className="text-gray-800 whitespace-pre-wrap">{ticket.body}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Manage</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <div className="text-sm text-gray-800">
                {ticket.category ? CATEGORY_LABELS[ticket.category] : "—"}
              </div>
            </div>

            {user?.role === "ADMIN" && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assigned to</label>
                <select
                  value={ticket.assignedToId ?? ""}
                  onChange={(e) => handleAssign(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* AI Actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">AI Tools</h2>
          <div className="space-y-2">
            <button
              onClick={() => handleAI("classify")}
              disabled={aiLoading !== null}
              className="w-full py-2 px-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              {aiLoading === "classify" ? "Classifying..." : "Auto-classify"}
            </button>
            <button
              onClick={() => handleAI("summarize")}
              disabled={aiLoading !== null}
              className="w-full py-2 px-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {aiLoading === "summarize" ? "Summarizing..." : "Generate summary"}
            </button>
            <button
              onClick={() => handleAI("reply")}
              disabled={aiLoading !== null}
              className="w-full py-2 px-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              {aiLoading === "reply" ? "Generating..." : "Suggest reply"}
            </button>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {ticket.aiSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-blue-800 mb-2">AI Summary</h2>
          <p className="text-sm text-blue-900">{ticket.aiSummary}</p>
        </div>
      )}

      {/* AI Suggested Reply */}
      {ticket.aiReply && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-green-800 mb-2">Suggested Reply</h2>
          <p className="text-sm text-green-900 whitespace-pre-wrap">{ticket.aiReply}</p>
        </div>
      )}
    </div>
  );
}
