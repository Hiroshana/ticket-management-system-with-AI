---
name: Selector Patterns
description: Established Playwright selector strategies for this codebase's shadcn/ui + React components
type: feedback
---

Use these selectors in the order listed — they match actual rendered HTML.

## Login page

| Target | Selector |
|--------|----------|
| Email input | `page.getByLabel("Email")` — `<Label htmlFor="email">` → `<Input id="email">` |
| Password input | `page.getByLabel("Password")` — `<Label htmlFor="password">` → `<Input id="password">` |
| Submit button | `page.getByRole("button", { name: /sign in/i })` |
| Server error | `page.getByRole("alert")` — shadcn `<Alert>` renders with `role="alert"` |
| Field error (email) | `page.locator("text=Invalid email address")` (exact Zod message) |
| Field error (password) | `page.locator("text=Password is required")` (exact Zod message) |
| Card heading | `page.getByRole("heading", { name: /sign in/i })` |

## Layout / sidebar (post-login)

| Target | Selector |
|--------|----------|
| Dashboard nav link | `page.getByRole("link", { name: "Dashboard" })` |
| Tickets nav link | `page.getByRole("link", { name: "Tickets" })` |
| Users nav link (admin only) | `page.getByRole("link", { name: "Users" })` |
| Sign out button | `page.getByRole("button", { name: /sign out/i })` |
| User name display | `page.getByText("Support Agent")` / `page.getByText("Admin User")` |
| Role display | `page.getByText("AGENT")` / `page.getByText("ADMIN")` |
| Loading indicator | `page.getByText("Loading...")` — ProtectedRoute loading branch |

## General rules

- Prefer `getByRole` and `getByLabel` over CSS selectors
- shadcn Alert = `role="alert"` (no need for data-testid)
- The Layout `<aside>` does NOT have an aria role — the `<nav>` inside does: `role="navigation"`
- `fullyParallel: false` + `workers: 1` — no race conditions on shared DB

**Why:** shadcn components use standard ARIA roles, making semantic selectors stable even when styles change.

**How to apply:** Always check if a shadcn component has an implicit ARIA role before reaching for CSS or data-testid.
