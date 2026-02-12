import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests', // Directory per i test
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html', // Reporter HTML di default
    use: {
        trace: 'on-first-retry', // Tracce su retry
        baseURL: 'http://localhost:8002/', // URL base per Kong Manager
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Aggiungi altri browser se vuoi: firefox, webkit
    ],
});