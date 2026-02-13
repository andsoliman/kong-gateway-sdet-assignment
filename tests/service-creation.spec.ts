import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to fill a form field if it's visible
 * @param page - Playwright page object
 * @param selector - CSS selector for the input field
 * @param value - Value to fill into the field
 */
async function fillFormField(page: Page, selector: string, value: string) {
    const field = page.locator(selector).first();
    if (await field.isVisible()) {
        await field.fill(value);
    }
}

/**
 * Helper function to create a service via Kong Manager UI
 * @param page - Playwright page object
 * @param name - Service name
 * @param url - Service upstream URL
 */
async function createService(page: Page, name: string, url: string) {
    // Navigate to service creation page
    try {
        await page.goto('/default/services/create');
    } catch (e) {
        // Fallback: click the new service button
        await page.getByTestId('new-gateway-service').click();
    }
    await page.waitForLoadState('networkidle');
    
    // Fill in the service form fields
    await fillFormField(page, 'input[name*="name" i]', name);
    await fillFormField(page, 'input[name*="url" i]', url);
    
    // Submit the form
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
}

/**
 * Helper function to create a route via Kong Manager UI
 * @param page - Playwright page object
 * @param name - Route name
 * @param path - Route path
 */
async function createRoute(page: Page, name: string, path: string) {
    // Navigate to route creation page
    await page.goto('/default/routes/create');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Fill route name
    await page.getByTestId('route-form-name').fill(name);

    //Choose the service created in the previous test
    await page.getByTestId("route-form-service-id").click();
    await page.getByText("test-service").click();

    // Fill route path
    await page.getByTestId('route-form-paths-input-1').fill(path);

    
    
    // Try to submit the form with multiple strategies
    const saveBtn = page.getByRole('button', { name: /save/i });
    await saveBtn.click();
}

// Serial test execution ensures test 1 completes before test 2 starts (required for data persistence)
test.describe.serial('Kong Gateway UI Tests', () => {
    /**
     * Setup before each test:
     * - Verify Kong Manager is accessible
     * - Dismiss license popup if present
     */
    test.beforeEach(async ({ page }) => {
        try {
            await page.goto('/', { timeout: 15000, waitUntil: 'domcontentloaded' });
            // Wait for Kong Manager main container to be visible
            await page.locator('[data-testid="app-layout"], [class*="main"], body').first().waitFor({ timeout: 10000 });
        } catch (e) {
            test.skip(true, 'Kong Manager not reachable at baseURL; skipping UI tests');
            return;
        }

        // Wait a bit for UI to fully render
        await page.waitForTimeout(2000);

        // Dismiss license popup if visible
        const licensePopup = page.locator('button:has-text("OK")').first();
        if (await licensePopup.isVisible({ timeout: 5000 })) {
            await licensePopup.click();
            await page.waitForTimeout(1000);
        }
    });

    /**
     * Test 1: Create a new Service
     * Validates service creation functionality
     */
    test('Create a new Service from scratch', async ({ page }) => {
        // Create test service using helper function
        await createService(page, 'test-service', 'http://example.com:80');
        
        // Verify service appears in the services list
        await page.goto('/default/services');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        await expect(page.getByTestId('test-service').first()).toBeVisible();
    });

    /**
     * Test 2: Create a Route associated with the Service
     * Uses the service created in Test 1 (requires serial execution)
     */
    test('Create a Route associated with the Service', async ({ page }) => {
        // Create a route using helper function
        await createRoute(page, 'test-route', '/test-path');
        
        // Verify route appears in the routes list
        await page.goto('/default/routes');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        await expect(page.getByTestId('test-route').first()).toBeVisible();
    });
});