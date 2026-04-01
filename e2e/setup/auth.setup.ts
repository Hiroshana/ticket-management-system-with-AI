/**
 * auth.setup.ts
 *
 * Runs once before the main test projects (via the "setup" project dependency
 * in playwright.config.ts). Logs in as admin and as agent, then snapshots the
 * cookie jar to disk so that subsequent test files can reuse the authenticated
 * browser context without re-logging in.
 *
 * Saved state paths:
 *   e2e/.auth/admin.json
 *   e2e/.auth/agent.json
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";
const AGENT_EMAIL = "agent@example.com";
const AGENT_PASSWORD = "agent123";

const ADMIN_AUTH_FILE = path.join(__dirname, "../.auth/admin.json");
const AGENT_AUTH_FILE = path.join(__dirname, "../.auth/agent.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for successful redirect — the root route renders the dashboard
  // which lives behind ProtectedRoute and shows the Layout sidebar.
  await expect(page).toHaveURL("/", { timeout: 10_000 });
  // Confirm the sidebar is rendered, meaning auth state resolved correctly
  await expect(
    page.getByRole("link", { name: "Dashboard" })
  ).toBeVisible();

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

setup("authenticate as agent", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(AGENT_EMAIL);
  await page.getByLabel("Password").fill(AGENT_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL("/", { timeout: 10_000 });
  await expect(
    page.getByRole("link", { name: "Dashboard" })
  ).toBeVisible();

  await page.context().storageState({ path: AGENT_AUTH_FILE });
});
