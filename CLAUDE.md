# Ticket Management System — Project Memory

## Overview

An AI-powered support ticket management system for handling student support emails. Agents can view, classify, and respond to tickets. AI features auto-classify, summarize, and suggest replies using Claude.

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Runtime    | Bun                                             |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS v4     |
| Backend    | Express 4, TypeScript, Bun                      |
| Database   | PostgreSQL via Prisma ORM                       |
| Auth       | express-session (database sessions)             |
| AI         | Claude API (`@anthropic-ai/sdk`)                |
| Email      | SendGrid or Mailgun (Phase 6)                   |

## Monorepo Structure

```
/
├── CLAUDE.md
├── package.json          # Bun workspace root (workspaces: [client, server])
├── client/               # React frontend (port 5173)
│   ├── vite.config.ts    # @tailwindcss/vite plugin + /api proxy to :3001
│   └── src/
│       ├── App.tsx
│       ├── context/AuthContext.tsx
│       ├── components/Layout.tsx, ProtectedRoute.tsx
│       ├── lib/api.ts          # fetch wrapper, credentials: include
│       ├── types/index.ts      # shared TypeScript types
│       └── pages/
│           ├── LoginPage.tsx
│           ├── DashboardPage.tsx
│           ├── TicketsPage.tsx
│           ├── TicketDetailPage.tsx
│           └── UsersPage.tsx
└── server/               # Express backend (port 3001)
    ├── prisma/schema.prisma
    └── src/
        ├── index.ts             # app entry, cors, session, routes
        ├── lib/prisma.ts        # singleton PrismaClient
        ├── middleware/auth.ts   # requireAuth, requireAdmin
        ├── prisma/seed.ts       # admin + agent + knowledge base seed
        └── routes/
            ├── auth.ts          # POST /login, POST /logout, GET /me
            ├── users.ts         # CRUD — admin only
            ├── tickets.ts       # CRUD + filter/sort
            └── ai.ts            # classify, summarize, suggest-reply
```

## Data Models (Prisma)

- **User** — id, email, password (bcrypt), name, role (ADMIN | AGENT)
- **Ticket** — id, subject, body, fromEmail, fromName, status, category, aiSummary, aiReply, assignedToId, createdById
- **KnowledgeBase** — id, title, content, category

## User Roles

- **ADMIN** — seeded at startup; manages agents, assigns tickets
- **AGENT** — created by admin; views and resolves tickets

## Ticket Domain

- **Statuses:** OPEN → RESOLVED → CLOSED
- **Categories:** GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST

## API Routes

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/users              (admin)
POST   /api/users              (admin)
PATCH  /api/users/:id          (admin)
DELETE /api/users/:id          (admin)

GET    /api/tickets            ?status=&category=&sortBy=&order=
GET    /api/tickets/:id
POST   /api/tickets
PATCH  /api/tickets/:id

POST   /api/ai/classify/:ticketId
POST   /api/ai/summarize/:ticketId
POST   /api/ai/suggest-reply/:ticketId
```

## Environment Variables

Copy `server/.env.example` to `server/.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_management
SESSION_SECRET=change-this-to-a-random-secret
CLIENT_URL=http://localhost:5173
ANTHROPIC_API_KEY=your-anthropic-api-key
NODE_ENV=development
PORT=3001
```

## Dev Commands

```bash
bun install                  # install all workspace deps
bun run dev:server           # start Express server
bun run dev:client           # start Vite dev server

# From server/
bun run db:generate          # generate Prisma client (run after schema changes)
bun run db:migrate           # apply migrations
bun run db:seed              # seed admin + agent + knowledge base
bun run db:studio            # open Prisma Studio
```

## Tailwind CSS v4 Notes

- Uses `@tailwindcss/vite` plugin — no PostCSS config or `tailwind.config.js`
- CSS entry uses `@import "tailwindcss"` (not the old `@tailwind` directives)
- Reconfigure via CSS `@theme` blocks if custom tokens are needed

## Implementation Phases

- [x] Phase 1: Project setup (monorepo, Express, React, Prisma)
- [ ] Phase 2: Authentication (login page, session middleware, route protection)
- [ ] Phase 3: User management (admin CRUD for agents)
- [ ] Phase 4: Ticket CRUD (list with filters, detail view)
- [ ] Phase 5: AI features (classify, summarize, suggest reply, knowledge base)
- [ ] Phase 6: Email integration (SendGrid/Mailgun inbound + outbound)
- [ ] Phase 7: Dashboard (stats, category breakdown, recent tickets)
- [ ] Phase 8: Polish & deployment (validation, Docker, Docker Compose)

## Documentation — Always Use Context7

When working with any library in this project, **always fetch up-to-date docs via context7** before writing code. Never rely solely on training data — APIs change.

### Resolved Library IDs

| Library            | Context7 ID                            |
|--------------------|----------------------------------------|
| Bun                | `/oven-sh/bun`                         |
| Express            | `/websites/expressjs_en`               |
| Prisma             | `/websites/prisma_io`                  |
| React Router       | `/remix-run/react-router`              |
| Tailwind CSS v4    | `/tailwindlabs/tailwindcss.com`        |
| TypeScript         | `/microsoft/typescript`                |

### How to use context7

1. Call `mcp__context7__resolve-library-id` with the library name to get its ID
2. Call `mcp__context7__query-docs` with the ID and a specific query
3. Use the returned snippets to write correct, up-to-date code
