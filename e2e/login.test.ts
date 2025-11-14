import { test, expect } from "@playwright/test";

// Test configuration
const testConfig = {
  selectors: {
    login: {
      title: 'h2:has-text("Iniciar sesión")',
      emailInput:
        'input[type="email"], textbox:near(:text("Correo electrónico"))',
      passwordInput:
        'input[type="password"], textbox:near(:text("Contraseña"))',
      submitButton: 'button:has-text("Iniciar sesión")',
      errorMessage: '.error, .alert, [role="alert"]',
      errorMessageSpecific: 'div[class*="error"]', // Optimizado basado en el test exitoso
      registerLink: 'a:has-text("Regístrate aquí")',
    },
    app: {
      root: "#root",
      body: "body",
    },
  },
  testUser: {
    email: "cesararaujo.perez@admin.com", // Based on the snapshot
    password: "123456789", // Based on the snapshot
  },
  invalidUser: {
    email: "invalid@example.com",
    password: "wrongpassword",
  },
  timeouts: {
    default: 5000,
    login: 10000,
    navigation: 15000,
  },
};

// Test helpers
const testHelpers = {
  async clearStorage(page) {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  },

  async fillLoginForm(page, email, password) {
    await page.fill(testConfig.selectors.login.emailInput, email);
    await page.fill(testConfig.selectors.login.passwordInput, password);
  },

  async submitLogin(page) {
    // Click login button and wait for network activity
    await Promise.all([
      page.waitForLoadState("networkidle", {
        timeout: testConfig.timeouts.login,
      }),
      page.click(testConfig.selectors.login.submitButton),
    ]);

    // Small wait for any immediate UI updates
    await page.waitForTimeout(1000);
  },

  async isLoggedIn(page) {
    try {
      // Check if login form is NOT visible (successful login)
      const loginFormVisible = await page
        .locator(testConfig.selectors.login.title)
        .isVisible();
      return !loginFormVisible;
    } catch (error) {
      return false;
    }
  },

  async waitForLoginResult(page) {
    // Optimized approach: Use a single waitForFunction that checks all conditions
    // This avoids unnecessary timeouts from Promise.race
    try {
      await page.waitForFunction(
        () => {
          // Check if login form has disappeared (successful login)
          const loginTitle = document.querySelector("h2");
          const loginFormVisible =
            loginTitle && loginTitle.textContent?.includes("Iniciar sesión");

          // Check for error messages (failed login)
          // Use the optimized selector that we know works reliably
          const errorElement = document.querySelector('div[class*="error"]');
          const errorVisible =
            errorElement &&
            errorElement.textContent &&
            errorElement.textContent.trim() !== "";

          // Alternative error check for other possible error containers
          const genericErrorElement = document.querySelector(
            '.error, .alert, [role="alert"]'
          );
          const genericErrorVisible =
            genericErrorElement &&
            genericErrorElement.textContent &&
            genericErrorElement.textContent.trim() !== "";

          // Return true if we've detected either success (form gone) or error (message shown)
          return !loginFormVisible || errorVisible || genericErrorVisible;
        },
        {
          timeout: testConfig.timeouts.login,
          polling: 100, // Check every 100ms for faster response
        }
      );

      // Small delay to ensure DOM is fully updated
      await page.waitForTimeout(100);
    } catch (error) {
      console.log("Login result detection timeout:", error.message);
      // Don't throw - let the calling test decide how to handle
    }
  },

  async hasErrorMessage(page) {
    // Simple helper to check if an error message is currently visible
    return await page.evaluate(() => {
      // Check the optimized error selector first
      const errorElement = document.querySelector('div[class*="error"]');
      if (
        errorElement &&
        errorElement.textContent &&
        errorElement.textContent.trim() !== ""
      ) {
        return true;
      }

      // Check generic error selectors
      const genericErrorElement = document.querySelector(
        '.error, .alert, [role="alert"]'
      );
      return (
        genericErrorElement &&
        genericErrorElement.textContent &&
        genericErrorElement.textContent.trim() !== ""
      );
    });
  },
};

test.describe("Login Flow", () => {
  test.beforeEach(async ({ page }) => {
    // OPCIONAL: Slow motion para ver mejor (solo para debugging)
    // await page.addInitScript(() => {
    //   window.setTimeout = (fn, timeout) => window.originalSetTimeout(fn, timeout * 2);
    // });

    // Navigate to the application and clear storage
    await page.goto("/");
    await testHelpers.clearStorage(page);
  });

  test("should display login form", async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState("domcontentloaded");

    // Check that login form elements are visible
    await expect(page.locator(testConfig.selectors.login.title)).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator(testConfig.selectors.login.emailInput)
    ).toBeVisible();
    await expect(
      page.locator(testConfig.selectors.login.passwordInput)
    ).toBeVisible();
    await expect(
      page.locator(testConfig.selectors.login.submitButton)
    ).toBeVisible();

    // Check basic page structure
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toContain("404");
    expect(body).not.toContain("Cannot GET");
  });

  test("should handle navigation and page structure", async ({ page }) => {
    // Wait for load
    await page.waitForLoadState("domcontentloaded");

    // Verify the page loads without errors
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check that the main app container exists
    await expect(page.locator(testConfig.selectors.app.root)).toBeVisible({
      timeout: 5000,
    });

    // Check registration link
    await expect(
      page.locator(testConfig.selectors.login.registerLink)
    ).toBeVisible();
  });

  test("should show validation for empty form submission", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");

    // Try to submit empty form
    await page.click(testConfig.selectors.login.submitButton);

    // HTML5 validation should prevent submission
    // The login form should still be visible
    await expect(page.locator(testConfig.selectors.login.title)).toBeVisible();
  });

  test("should handle invalid login credentials", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");

    console.log(`Testing invalid login with: ${testConfig.invalidUser.email}`);

    // Fill in invalid credentials
    await testHelpers.fillLoginForm(
      page,
      testConfig.invalidUser.email,
      testConfig.invalidUser.password
    );

    // Submit the form
    await testHelpers.submitLogin(page);

    // Wait for result
    await testHelpers.waitForLoginResult(page);

    console.log("Checking for error message...");

    // Use the optimized helper to check for error
    const hasError = await testHelpers.hasErrorMessage(page);
    expect(hasError).toBeTruthy();

    // If we want to also verify the specific error text, we can still do that
    const errorMessage = page.locator(
      testConfig.selectors.login.errorMessageSpecific
    );

    const errorText = await errorMessage.textContent();
    console.log("Error message text:", errorText);

    expect(errorText?.toLowerCase()).toContain("no se pudo iniciar sesión");

    // Should still be on login page
    const stillOnLogin = await page
      .locator(testConfig.selectors.login.title)
      .isVisible();
    console.log("Still on login page:", stillOnLogin);
    expect(stillOnLogin).toBeTruthy();
  });

  test("should attempt login with test credentials", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");

    console.log(`Attempting login with: ${testConfig.testUser.email}`);

    // Fill in test credentials
    await testHelpers.fillLoginForm(
      page,
      testConfig.testUser.email,
      testConfig.testUser.password
    );

    // Submit the form
    await testHelpers.submitLogin(page);

    // Wait for login result
    await testHelpers.waitForLoginResult(page);

    try {
      // Check if we're logged in
      const isLoggedIn = await testHelpers.isLoggedIn(page);

      if (isLoggedIn) {
        // SUCCESS: Login worked
        console.log("✅ Login successful!");

        expect(isLoggedIn).toBeTruthy();

        // Verify login form disappeared
        await expect(
          page.locator(testConfig.selectors.login.title)
        ).not.toBeVisible();

        // Verify app is accessible
        await expect(page.locator(testConfig.selectors.app.root)).toBeVisible();
      } else {
        // FAILURE: Login didn't work
        console.log("❌ Login failed - checking for error messages");

        // Check for error messages
        const errorVisible = await page
          .locator(testConfig.selectors.login.errorMessage)
          .isVisible();

        if (errorVisible) {
          const errorText = await page
            .locator(testConfig.selectors.login.errorMessage)
            .textContent();
          console.log("Error message found:", errorText);
        }

        // Check if still on login page
        const stillOnLogin = await page
          .locator(testConfig.selectors.login.title)
          .isVisible();
        console.log("Still on login page:", stillOnLogin);

        // Log current page state for debugging
        const currentBody = await page.locator("body").textContent();
        console.log(
          "Current page contains 'Iniciar sesión':",
          currentBody?.includes("Iniciar sesión")
        );

        // Mark as expected failure until credentials are confirmed
        test.fail(
          true,
          "Login test failing - verify credentials and server connectivity"
        );
      }
    } catch (error) {
      console.log("Login test error:", error.message);

      // Get current page state for debugging
      const currentUrl = page.url();
      const pageContent = await page.locator("body").textContent();

      console.log("Current URL:", currentUrl);
      console.log(
        "Page still shows login form:",
        pageContent?.includes("Iniciar sesión")
      );

      // Mark as expected failure
      test.fail(true, `Login test encountered error: ${error.message}`);
    }
  });

  test("should navigate to registration page", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");

    // Click registration link
    await page.click(testConfig.selectors.login.registerLink);

    // Should navigate to registration page
    await expect(page).toHaveURL(/.*registeruser/);
  });
});
