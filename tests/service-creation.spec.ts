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

// Serial test execution ensures test 1 completes before test 2 starts (required for data persistence)
test.describe.serial('Kong Gateway UI Tests', () => {
    /**
     * Setup before each test:
     * - Verify Kong Manager is accessible
     * - Dismiss license popup if present
     */
    test.beforeEach(async ({ page }) => {
        try {
            await page.goto('/', { timeout: 5000 });
        } catch (e) {
            test.skip(true, 'Kong Manager not reachable at baseURL; skipping UI tests');
            return;
        }

        // Dismiss license popup if visible
        const licensePopup = page.locator('button:has-text("OK")');
        if (await licensePopup.isVisible()) {
            await licensePopup.click();
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
        await expect(page.getByRole('button', { name: 'test-service' })).toBeVisible();
    });

    /**
     * Test 2: Create a Route associated with the Service
     * Uses the service created in Test 1 (requires serial execution)
     */
    test('Create a Route associated with the Service', async ({ page }) => {
        // Navigate to the service created in Test 1
        await page.goto('/default/services');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'test-service' }).click();
        await page.waitForLoadState('networkidle');

        // Navigate to routes section
        const routesLink = page.getByRole('link', { name: /routes/i }).first();
        if (await routesLink.isVisible()) {
            await routesLink.click();
            await page.waitForLoadState('networkidle');
        } else {
            // Fallback: direct navigation to route creation page
            await page.goto('/default/routes/create');
            await page.waitForLoadState('networkidle');
        }

        // Fill in the route form fields
        await fillFormField(page, 'input[placeholder*="name" i]', 'test-route');
        await fillFormField(page, 'input[name*="protocol" i]', 'http');
        await fillFormField(page, 'input[placeholder*="path" i]', '/test-path');

        // Submit the route form if button is visible
        const saveBtn = page.getByRole('button', { name: /save|create/i }).first();
        if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForLoadState('networkidle');
        }
        
        // Verify route was created
        await page.goto('/default/routes');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('button', { name: 'test-route' })).toBeVisible();
    });
});