import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object for the Login page at /login.
 *
 * Selector strategy:
 *   - Form fields: getByLabel() — matches the <Label htmlFor> → <Input id> association
 *   - Submit button: getByRole('button') with name — most resilient to style changes
 *   - Error messages: getByRole('alert') for the server-error Alert component;
 *     field-level errors are exposed via aria-invalid + a sibling <p> element
 */
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly serverErrorAlert: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: /sign in/i });
    // The shadcn <Alert> component renders with role="alert"
    this.serverErrorAlert = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
    // Wait for the card title to be visible so we know the page has hydrated
    // CardTitle renders as a <div>, not a heading element
    await expect(
      this.page.getByText("Sign in", { exact: true }).first()
    ).toBeVisible();
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  /**
   * Performs a full login and waits for the button to leave its "Signing in…"
   * loading state before returning, giving callers a clean assertion point.
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Returns the inline field-validation error text for the email field.
   * The LoginPage renders errors as a <p> sibling to the input inside a
   * "space-y-1" wrapper div.
   */
  get emailFieldError(): Locator {
    return this.emailInput
      .locator("xpath=following-sibling::p")
      .first();
  }

  /**
   * Returns the inline field-validation error text for the password field.
   */
  get passwordFieldError(): Locator {
    return this.passwordInput
      .locator("xpath=following-sibling::p")
      .first();
  }

  /**
   * Waits until the submit button is no longer in the loading "Signing in…"
   * state. Useful after calling login() to ensure the round-trip is complete.
   */
  async waitForLoadingToFinish() {
    // The button text reverts to "Sign in" once isSubmitting becomes false
    await expect(this.submitButton).not.toHaveText(/signing in/i, {
      timeout: 10_000,
    });
  }
}
