/**
 * auth.spec.ts — End-to-end tests for the authentication system
 *
 * Coverage:
 *   Login page
 *     - Happy path: admin logs in and lands on dashboard
 *     - Happy path: agent logs in and lands on dashboard
 *     - Wrong password shows server error
 *     - Non-existent email shows server error
 *     - Submitting an empty form shows inline field validation errors
 *     - Submitting with a syntactically invalid email shows inline error
 *     - Submit button shows loading state while request is in flight
 *   Route protection
 *     - Unauthenticated user visiting / is redirected to /login
 *     - Unauthenticated user visiting /tickets is redirected to /login
 *     - Unauthenticated user visiting /users is redirected to /login
 *   Post-login redirect
 *     - Already-authenticated admin visiting /login is redirected away
 *       (note: the app currently does NOT implement this guard — see test
 *        marked as "known limitation" below)
 *   Logout
 *     - Sign-out button clears session and redirects to /login
 *     - After logout, accessing / redirects back to /login
 *   Session persistence
 *     - Session survives a full page reload
 *
 * Credentials (from server/src/prisma/seed.ts):
 *   admin@example.com / admin123  (role: ADMIN)
 *   agent@example.com / agent123  (role: AGENT)
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

// ---------------------------------------------------------------------------
// Shared test credentials
// ---------------------------------------------------------------------------
const ADMIN = { email: "admin@example.com", password: "admin123" };
const AGENT = { email: "agent@example.com", password: "agent123" };

// ---------------------------------------------------------------------------
// Group 1: Login page — form interactions
// ---------------------------------------------------------------------------
test.describe("Login page", () => {
  test("renders the sign-in form with email, password inputs and submit button", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test("shows card title 'Sign in' and description 'Support Desk'", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // CardTitle renders as a <div>, not a heading element
    await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Support Desk")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Happy paths
  // -------------------------------------------------------------------------
  test("admin can log in and is redirected to the dashboard", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN.email, ADMIN.password);

    // App navigates to "/" on success (see LoginPage.tsx onSubmit → navigate("/"))
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Layout sidebar is present — confirms ProtectedRoute passed
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
    // Admin-only "Users" nav link should be visible
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("agent can log in and is redirected to the dashboard", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(AGENT.email, AGENT.password);

    await expect(page).toHaveURL("/", { timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
    // Agents do NOT see the Users link
    await expect(
      page.getByRole("link", { name: "Users" })
    ).not.toBeVisible();
  });

  test("agent sidebar shows agent's name and role", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(AGENT.email, AGENT.password);

    await expect(page).toHaveURL("/", { timeout: 10_000 });
    await expect(page.getByText("Support Agent")).toBeVisible();
    await expect(page.getByText("AGENT", { exact: true })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Error states — server-side
  // -------------------------------------------------------------------------
  test("shows a server error alert when password is wrong", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN.email, "wrong-password");

    // The <Alert variant="destructive"> wraps the message
    await expect(loginPage.serverErrorAlert).toBeVisible({ timeout: 8_000 });
    // Should still be on the login page
    await expect(page).toHaveURL("/login");
  });

  test("shows a server error alert when email does not exist", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("nobody@example.com", "irrelevant");

    await expect(loginPage.serverErrorAlert).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL("/login");
  });

  test("server error alert is cleared when a new submission starts", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // First: failed login to produce the error
    await loginPage.login(ADMIN.email, "bad-password");
    await expect(loginPage.serverErrorAlert).toBeVisible({ timeout: 8_000 });

    // Second: correct login — the component calls setServerError("") before
    // the API request, so the alert should disappear
    await loginPage.login(ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL("/", { timeout: 10_000 });
    await expect(loginPage.serverErrorAlert).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Error states — client-side (Zod / react-hook-form validation)
  // -------------------------------------------------------------------------
  test("shows inline validation errors when the form is submitted empty", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit without filling anything — react-hook-form fires client-side
    // validation before the network request
    await loginPage.submit();

    // The email schema: z.string().email("Invalid email address")
    // When the field is empty the zod string check fires first with a default
    // "Invalid email" message. Confirm *some* error text appears near the email
    // input.
    const emailError = page.locator("text=Invalid email address");
    await expect(emailError).toBeVisible();

    // The password schema: z.string().min(1, "Password is required")
    const passwordError = page.locator("text=Password is required");
    await expect(passwordError).toBeVisible();

    // No network request was made — we're still on the login page
    await expect(page).toHaveURL("/login");
  });

  test("shows email validation error for a syntactically invalid email", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail("not-an-email");
    await loginPage.fillPassword("somepassword");
    await loginPage.submit();

    await expect(page.locator("text=Invalid email address")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("shows password required error when only email is filled", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail(ADMIN.email);
    // Leave password empty
    await loginPage.submit();

    await expect(page.locator("text=Password is required")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  test("submit button shows 'Signing in...' while the request is in flight", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Slow the response down so we can observe the loading state
    await page.route("/api/auth/sign-in/email", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    await loginPage.fillEmail(ADMIN.email);
    await loginPage.fillPassword(ADMIN.password);

    // Click without awaiting navigation — we want to assert the intermediate state
    const submitPromise = loginPage.submit();

    // While loading, the button text changes to "Signing in..." — use a locator that matches it
    const loadingButton = page.getByRole("button", { name: /signing in/i });
    await expect(loadingButton).toBeVisible();
    await expect(loadingButton).toBeDisabled();

    // Let it complete
    await submitPromise;
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 2: Route protection — unauthenticated access
// ---------------------------------------------------------------------------
test.describe("Route protection (unauthenticated)", () => {
  test("visiting / without a session redirects to /login", async ({ page }) => {
    // Ensure no leftover session cookies by using a fresh context (default for
    // each test) and navigating directly
    await page.goto("/");
    await expect(page).toHaveURL("/login", { timeout: 8_000 });
  });

  test("visiting /tickets without a session redirects to /login", async ({
    page,
  }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL("/login", { timeout: 8_000 });
  });

  test("visiting /users without a session redirects to /login", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/login", { timeout: 8_000 });
  });

  test("visiting an unknown route without a session redirects to /login", async ({
    page,
  }) => {
    // App has <Route path="*" element={<Navigate to="/" />} /> which then hits
    // ProtectedRoute and bounces to /login
    await page.goto("/some/random/path");
    await expect(page).toHaveURL("/login", { timeout: 8_000 });
  });

  test("ProtectedRoute shows loading indicator while auth state resolves", async ({
    page,
  }) => {
    // Delay the /api/auth/get-session response so the loading branch renders
    await page.route("/api/auth/get-session", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.goto("/");

    // The ProtectedRoute loading branch: <div>Loading...</div>
    await expect(page.getByText("Loading...")).toBeVisible();

    // Eventually resolves — unauthenticated, so ends up at /login
    await expect(page).toHaveURL("/login", { timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Group 3: Role-based access control
// ---------------------------------------------------------------------------
test.describe("Role-based access (agent cannot reach admin-only routes)", () => {
  // Log in as agent before each test
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(AGENT.email, AGENT.password);
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("agent navigating to /users is redirected to /", async ({ page }) => {
    await page.goto("/users");
    // ProtectedRoute adminOnly: <Navigate to="/" replace />
    await expect(page).toHaveURL("/", { timeout: 8_000 });
  });

  test("agent does not see 'Users' link in sidebar", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Users" })
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Group 4: Logout
// ---------------------------------------------------------------------------
test.describe("Logout", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin before each test in this group
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("clicking 'Sign out' redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: /sign out/i }).click();

    await expect(page).toHaveURL("/login", { timeout: 8_000 });
  });

  test("after logout, visiting / redirects back to /login", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/login", { timeout: 8_000 });

    // Navigate to a protected route — should bounce to /login again
    await page.goto("/");
    await expect(page).toHaveURL("/login", { timeout: 8_000 });
  });

  test("after logout, visiting /tickets redirects to /login", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/login", { timeout: 8_000 });

    await page.goto("/tickets");
    await expect(page).toHaveURL("/login", { timeout: 8_000 });
  });

  test("after logout, the login form is shown (not the dashboard)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/login", { timeout: 8_000 });

    // CardTitle renders as a <div>, not a heading element
    await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible();
    // Sidebar navigation must NOT be visible
    await expect(page.getByRole("navigation")).not.toBeVisible();
  });

  test("after logout, the /api/auth/get-session call returns no user", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/login", { timeout: 8_000 });

    // Directly verify the server session is gone
    const res = await page.request.get("/api/auth/get-session");
    const body = await res.json();
    // Better Auth returns null session when unauthenticated
    expect(body?.session).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Group 5: Session persistence across reload
// ---------------------------------------------------------------------------
test.describe("Session persistence", () => {
  test("admin session survives a full page reload", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Reload the page — AuthContext re-fetches /api/auth/get-session on mount
    await page.reload();

    // Should still be on the dashboard (not redirected to /login)
    await expect(page).toHaveURL("/", { timeout: 10_000 });
    await expect(
      page.getByRole("link", { name: "Dashboard" })
    ).toBeVisible();
  });

  test("agent session survives a full page reload", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(AGENT.email, AGENT.password);
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    await page.reload();

    await expect(page).toHaveURL("/", { timeout: 10_000 });
    await expect(
      page.getByRole("link", { name: "Tickets" })
    ).toBeVisible();
  });

  test("user info is restored from session on reload", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(AGENT.email, AGENT.password);
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    await page.reload();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Sidebar shows the user name from the session
    await expect(page.getByText("Support Agent")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Group 6: API-layer contract (thin sanity checks on the endpoints directly)
// ---------------------------------------------------------------------------
test.describe("Auth API contract", () => {
  test("POST /api/auth/sign-in/email returns 200 and a user for valid credentials", async ({
    page,
  }) => {
    const res = await page.request.post("/api/auth/sign-in/email", {
      data: { email: ADMIN.email, password: ADMIN.password },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user).toBeTruthy();
    expect(body.user.email).toBe(ADMIN.email);
    expect(body.user.role).toBe("ADMIN");
  });

  test("POST /api/auth/sign-in/email returns an error status for bad credentials", async ({
    page,
  }) => {
    const res = await page.request.post("/api/auth/sign-in/email", {
      data: { email: ADMIN.email, password: "wrong" },
      headers: { "Content-Type": "application/json" },
      failOnStatusCode: false,
    });
    // Better Auth returns 4xx for invalid credentials
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("GET /api/auth/get-session returns session after login", async ({
    page,
  }) => {
    // Log in first via the API to get the session cookie on this context
    await page.request.post("/api/auth/sign-in/email", {
      data: { email: AGENT.email, password: AGENT.password },
      headers: { "Content-Type": "application/json" },
    });

    const res = await page.request.get("/api/auth/get-session");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.user?.email).toBe(AGENT.email);
  });

  test("GET /api/auth/get-session returns null session when unauthenticated", async ({
    page,
  }) => {
    // Fresh context — no cookies
    const res = await page.request.get("/api/auth/get-session");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.session).toBeFalsy();
  });

  test("POST /api/auth/sign-out returns 200 and clears the session", async ({
    page,
  }) => {
    // Sign in
    await page.request.post("/api/auth/sign-in/email", {
      data: { email: ADMIN.email, password: ADMIN.password },
      headers: { "Content-Type": "application/json" },
    });

    // Sign out
    const signOutRes = await page.request.post("/api/auth/sign-out");
    expect(signOutRes.status()).toBe(200);

    // Session should now be gone
    const sessionRes = await page.request.get("/api/auth/get-session");
    const body = await sessionRes.json();
    expect(body?.session).toBeFalsy();
  });
});
