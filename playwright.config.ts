import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the ticket-management-system E2E suite.
 *
 * Project execution order:
 *   1. "setup"    — runs auth.setup.ts once; saves session state to e2e/.auth/
 *   2. "chromium" — runs all *.spec.ts files; depends on "setup" completing first
 *
 * Auth state files produced by setup:
 *   e2e/.auth/admin.json  — authenticated admin browser context
 *   e2e/.auth/agent.json  — authenticated agent browser context
 *
 * These files are used by test suites that need pre-authenticated state
 * (e.g. tickets.spec.ts, users.spec.ts) via `test.use({ storageState: ... })`.
 * The auth.spec.ts suite itself does NOT use stored state — it tests the login
 * flow directly with a clean browser context.
 */
export default defineConfig({
  testDir: "./e2e",

  // Run tests serially inside each file; files may run in parallel (workers: 1
  // keeps things predictable against a single shared test database).
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    // ------------------------------------------------------------------
    // Setup project — saves authenticated session state to disk.
    // Runs before any test project that lists it as a dependency.
    // ------------------------------------------------------------------
    {
      name: "setup",
      testMatch: /setup\/auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // ------------------------------------------------------------------
    // Main test project — all *.spec.ts files in e2e/
    // The auth.spec.ts tests deliberately use a clean (unauthenticated)
    // context because they are testing login itself.  Other spec files
    // (tickets, users, etc.) will opt in to stored state per-suite via:
    //
    //   test.use({ storageState: path.join(import.meta.dirname, '.auth/admin.json') })
    // ------------------------------------------------------------------
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

  webServer: [
    {
      command: "bun --env-file=.env.test run src/index.ts",
      cwd: "./server",
      url: "http://localhost:3002/api/auth/get-session",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "bun run dev",
      cwd: "./client",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      env: { API_TARGET: "http://localhost:3002" },
      timeout: 30_000,
    },
  ],
});
