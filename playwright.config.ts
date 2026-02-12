import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests', // Test directory
    fullyParallel: false, // Serial tests execution
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    expect: {
        timeout: 20000, // Expectation timeout
    },
    reporter: 'html', // Reporter  
    use: {
        trace: 'on-first-retry', // Trace on retry
        baseURL: 'http://localhost:8002/', // Base URL on Kong Manager
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});