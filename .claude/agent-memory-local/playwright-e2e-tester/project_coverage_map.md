---
name: Test Coverage Map
description: Which features/pages have E2E test coverage and which still need tests written
type: project
---

## Covered

### auth.spec.ts (31 tests, 6 groups)

- Login page rendering (form elements, card title/description)
- Happy path: admin login → dashboard redirect
- Happy path: agent login → dashboard redirect + role-based sidebar
- Server error alert: wrong password, unknown email
- Server error alert cleared on next submission
- Client-side validation: empty form, invalid email format, missing password
- Loading state: button shows "Signing in..." and is disabled during request
- Route protection: / /tickets /users all redirect unauthenticated users to /login
- Route protection: unknown routes redirect to /login
- ProtectedRoute loading state (delayed session check)
- Role-based access: agent visiting /users redirected to /
- Agent sidebar does not show "Users" link
- Logout: redirects to /login, clears access to all protected routes
- Logout: server session confirmed cleared via /api/auth/get-session
- Session persistence: admin and agent sessions survive page.reload()
- User info restored from session on reload
- API contract: sign-in returns 200 + user object with correct role
- API contract: bad credentials return 4xx
- API contract: get-session returns session after login
- API contract: get-session returns no session when unauthenticated
- API contract: sign-out returns 200 and clears session

## Not yet covered

- tickets.spec.ts — ticket list, filtering, detail view, status update, assignment
- users.spec.ts — admin CRUD for agents
- ai.spec.ts — classify, summarize, suggest-reply
- dashboard.spec.ts — stats and overview

## Known gaps / design decisions

- "Already logged-in user visiting /login is redirected away" — the app does NOT
  implement this guard (LoginPage has no redirect-if-authed logic), so no test
  was written for it. Add the guard to LoginPage.tsx first, then add a test.
