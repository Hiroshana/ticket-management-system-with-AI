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
| Auth       | Better Auth v1 (database sessions via Prisma)   |
| AI         | Claude API (`@anthropic-ai/sdk`)                |
| Email      | SendGrid or Mailgun (Phase 6)                   |

## Monorepo Structure

```
/
├── CLAUDE.md
├── package.json          # Bun workspace root (workspaces: [client, server])
├── playwright.config.ts  # e2e test config (Chromium, ports 5173 + 3001)
├── e2e/                  # Playwright test files
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
        ├── index.ts             # app entry, cors, session, routes, error handler
        ├── lib/auth.ts          # Better Auth config (BETTER_AUTH_SECRET required)
        ├── lib/prisma.ts        # singleton PrismaClient
        ├── middleware/auth.ts   # requireAuth, requireAdmin
        ├── prisma/seed.ts       # admin + agent + knowledge base seed
        ├── scripts/
        │   └── create-test-db.ts  # creates ticket_management_test DB if missing
        └── routes/
            ├── auth.ts          # POST /login, POST /logout, GET /me
            ├── users.ts         # CRUD — admin only
            ├── tickets.ts       # CRUD + filter/sort (sortBy allowlisted)
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
BETTER_AUTH_SECRET=change-this-to-a-random-secret-min-32-chars
BETTER_AUTH_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
ANTHROPIC_API_KEY=your-anthropic-api-key
NODE_ENV=development
PORT=3001
```

Generate `BETTER_AUTH_SECRET` with: `openssl rand -base64 32`

For e2e testing, `server/.env.test` points to `ticket_management_test` (gitignored). Same keys, different `DATABASE_URL`.

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

# E2e testing (from root)
bun run test:e2e             # create test DB + migrate + seed + run Playwright
bun run test:e2e:ui          # same but opens Playwright UI
# First time only:
bunx playwright install chromium
```

## Tailwind CSS v4 Notes

- Uses `@tailwindcss/vite` plugin — no PostCSS config or `tailwind.config.js`
- CSS entry uses `@import "tailwindcss"` (not the old `@tailwind` directives)
- Reconfigure via CSS `@theme` blocks if custom tokens are needed

## Authentication (Better Auth)

### Server (`server/src/lib/auth.ts`)
- Better Auth with `prismaAdapter` (PostgreSQL)
- Email/password enabled
- Custom user field: `role` (string, defaults to `"AGENT"`)
- Trusted origins from `CLIENT_URL` env var
- Mounted at `/api/auth/*` via `toNodeHandler(auth)` in `index.ts`
- `secret` set from `BETTER_AUTH_SECRET` env var (required)

### Middleware (`server/src/middleware/auth.ts`)
- `requireAuth` — validates session, attaches `req.user`, returns 401 if missing
- `requireAdmin` — same + checks `role === "ADMIN"`, returns 403 otherwise
- Both use `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`

### Client API endpoints (called via `client/src/lib/api.ts`)
| Action      | Endpoint                        |
|-------------|---------------------------------|
| Login       | `POST /api/auth/sign-in/email`  |
| Logout      | `POST /api/auth/sign-out`       |
| Get session | `GET /api/auth/get-session`     |

All requests use `credentials: "include"` for cookie-based sessions.

### Database models (managed by Better Auth)
- **User** — id, email, emailVerified, name, image, role, createdAt, updatedAt
- **Session** — token, expiration, IP, userAgent
- **Account** — OAuth provider data, credentials
- **Verification** — email verification tokens

### Environment variables
```
BETTER_AUTH_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://...
```

### Creating users
Use `auth.api.signUpEmail()` (not raw Prisma) to create users — this creates both `User` and `Account` records. Then update `role` via Prisma if needed. See `server/src/prisma/seed.ts` and `server/src/routes/users.ts`.

### Express type augmentation (`server/src/types/express.d.ts`)
```ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string; role: string };
    }
  }
}
```

## shadcn/ui

- Installed in `client/` with preset `b2pzIe` (style: `radix-nova`, icons: `lucide`)
- Primary color: purple `oklch(0.457 0.24 277.023)`, font: Inter Variable
- Add components: `npx shadcn@latest add <component>` from `client/`
- **React 18 + react-hook-form:** shadcn CLI v4 targets React 19 (no `forwardRef`). On React 18, any input component used with `register()` must be wrapped with `React.forwardRef` — otherwise the ref is stripped and validation breaks. Already applied to `Input`.

## Security Notes

- `PATCH /api/tickets/:id` — `assignedToId`, `aiSummary`, `aiReply` are admin-only fields; returns 403 for non-admin
- `GET /api/tickets` — `sortBy` is allowlisted to `[createdAt, updatedAt, subject, status, category]`
- Global async error handler in `index.ts` catches all unhandled route errors
- Remaining pre-production TODOs: rate limiting on sign-in, input length validation on tickets, self-deletion guard on `DELETE /api/users/:id`, move seed credentials to env vars

## Implementation Phases

- [x] Phase 1: Project setup (monorepo, Express, React, Prisma)
- [x] Phase 2: Authentication (login page, session middleware, route protection)
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
| Playwright         | `/microsoft/playwright`                |

### How to use context7

1. Call `mcp__context7__resolve-library-id` with the library name to get its ID
2. Call `mcp__context7__query-docs` with the ID and a specific query
3. Use the returned snippets to write correct, up-to-date code
