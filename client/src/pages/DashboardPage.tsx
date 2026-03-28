import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Ticket, TicketCategory, TicketStatus } from "../types";

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL_QUESTION: "General",
  TECHNICAL_QUESTION: "Technical",
  REFUND_REQUEST: "Refund",
};

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getTickets()
      .then((data) => setTickets(data as Ticket[]))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    OPEN: tickets.filter((t) => t.status === "OPEN").length,
    RESOLVED: tickets.filter((t) => t.status === "RESOLVED").length,
    CLOSED: tickets.filter((t) => t.status === "CLOSED").length,
  };

  const categoryCounts = tickets.reduce<Record<string, number>>((acc, t) => {
    if (t.category) acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});

  const recent = tickets.slice(0, 5);

  if (loading) {
    return (
      <div className="p-8 text-gray-500 text-sm">Loading dashboard...</div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(["OPEN", "RESOLVED", "CLOSED"] as TicketStatus[]).map((status) => (
          <Link
            key={status}
            to={`/tickets?status=${status}`}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow"
          >
            <div className="text-3xl font-bold text-gray-900">{counts[status]}</div>
            <div className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
              {status}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">By Category</h2>
          <div className="space-y-2">
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {categoryCounts[cat] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent tickets */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent Tickets</h2>
            <Link to="/tickets" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recent.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block group"
              >
                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                  {ticket.subject}
                </div>
                <div className="text-xs text-gray-400">{ticket.fromName}</div>
              </Link>
            ))}
            {recent.length === 0 && (
              <p className="text-sm text-gray-400">No tickets yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
