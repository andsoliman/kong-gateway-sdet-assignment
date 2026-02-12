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
        await expect(page.getByRole('button', { name: 'test-service' })).toBeVisible();
    });

    /**
     * Test 2: Create a Route associated with the Service
     * Uses the service created in Test 1 (requires serial execution)
     */
    test('Create a Route associated with the Service', async ({ page }) => {
        // Navigate to the service created in Test 1
        await page.goto('/default/services', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle');
        
        // Wait for service button with longer timeout
        await page.getByRole('button', { name: 'test-service' }).first().waitFor({ timeout: 10000 });
        await page.getByRole('button', { name: 'test-service' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Navigate to routes section from service detail page
        const routesLink = page.getByRole('link', { name: /routes/i }).first();
        let routesNavSuccess = false;
        
        try {
            if (await routesLink.isVisible({ timeout: 5000 })) {
                await routesLink.click();
                await page.waitForLoadState('networkidle');
                routesNavSuccess = true;
            }
        } catch (e) {
            // Fallback to direct navigation
            routesNavSuccess = false;
        }
        
        if (!routesNavSuccess) {
            // Fallback: direct navigation to route creation page
            await page.goto('/default/routes/create', { waitUntil: 'domcontentloaded' });
            await page.waitForLoadState('networkidle');
        } else {
            // If we're on routes list, find and click create button
            const createRouteBtn = page.getByRole('button', { name: /new|create/i }).first();
            try {
                if (await createRouteBtn.isVisible({ timeout: 5000 })) {
                    await createRouteBtn.click();
                    await page.waitForLoadState('networkidle');
                }
            } catch (e) {
                // Navigate directly if button not found
                await page.goto('/default/routes/create', { waitUntil: 'domcontentloaded' });
                await page.waitForLoadState('networkidle');
            }
        }

        await page.waitForTimeout(2000);

        // Fill in the route form fields with more specific selectors
        // Look for all text inputs and get the first few visible ones
        const allInputs = page.locator('input[type="text"]');
        const count = await allInputs.count();
        
        let namedFilled = false;
        let pathFilled = false;
        
        // Try to find and fill name field (usually first text input)
        for (let i = 0; i < count; i++) {
            const input = allInputs.nth(i);
            const isVisible = await input.isVisible({ timeout: 2000 }).catch(() => false);
            const placeholder = await input.getAttribute('placeholder').catch(() => '');
            const name = await input.getAttribute('name').catch(() => '');
            
            // Look for name or path in placeholder/name attribute
            if (isVisible && !namedFilled && (!placeholder && !name)) {
                await input.fill('test-route');
                namedFilled = true;
            } else if (isVisible && !pathFilled && (placeholder?.toLowerCase().includes('path') || name?.toLowerCase().includes('path'))) {
                await input.fill('/test-path');
                pathFilled = true;
            }
        }

        // If we didn't fill via loop, try direct selectors
        if (!namedFilled) {
            const nameInput = page.locator('input[placeholder*="name" i], input[name*="name" i], label:has-text("Name") ~ input').first();
            try {
                if (await nameInput.isVisible({ timeout: 2000 })) {
                    await nameInput.fill('test-route');
                }
            } catch (e) { }
        }

        if (!pathFilled) {
            const pathInput = page.locator('input[placeholder*="path" i], input[name*="path" i]').first();
            try {
                if (await pathInput.isVisible({ timeout: 2000 })) {
                    await pathInput.fill('/test-path');
                }
            } catch (e) { }
        }

        // Handle protocol field - try multiple approaches
        const protocolSelectors = [
            'select[name*="protocol" i]',
            '[role="combobox"][aria-label*="protocol" i]',
            'input[name*="protocol" i]',
            'div[class*="protocol"] select',
            'div[class*="protocol"] input'
        ];
        
        for (const selector of protocolSelectors) {
            try {
                const elem = page.locator(selector).first();
                if (await elem.isVisible({ timeout: 2000 })) {
                    const tagName = await elem.evaluate(el => el.tagName);
                    if (tagName === 'SELECT') {
                        await elem.selectOption('http').catch(() => {});
                    } else {
                        await elem.click().catch(() => {});
                        await page.getByRole('option', { name: /http/i }).first().click().catch(() => {});
                    }
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        // Submit the route form
        const saveBtn = page.getByRole('button', { name: /save|create|submit/i }).first();
        let submitted = false;
        try {
            if (await saveBtn.isVisible({ timeout: 5000 })) {
                await saveBtn.click();
                submitted = true;
                await page.waitForTimeout(3000);
                await page.waitForLoadState('networkidle');
            }
        } catch (e) {
            // Try finding button by other means
            const btn = page.locator('button').filter({ hasText: /save|create|submit/i }).first();
            try {
                if (await btn.isVisible({ timeout: 3000 })) {
                    await btn.click();
                    submitted = true;
                    await page.waitForTimeout(3000);
                    await page.waitForLoadState('networkidle');
                }
            } catch (e2) { }
        }
        
        // Verify route was created by checking the routes list
        await page.goto('/default/routes', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('button', { name: 'test-route' })).toBeVisible({ timeout: 10000 });
    });
});