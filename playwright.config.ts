import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60000,
  forbidOnly: isCI,
  retries: isCI ? 2 : 2,
  workers: isCI ? 1 : 2,

  reporter: [
    ['list'],
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['allure-playwright']
  ],

  use: {
    baseURL: 'http://localhost:9090/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 25000,
    headless: true
  },

  projects: [
    // UI + E2E → all three browser engines
    {
      name: 'chromium',
      testMatch: ['**/tests/ui/**/*.spec.ts', '**/tests/e2e/**/*.spec.ts' , '**/tests/api/**/*.spec.ts' , '**/tests/performance-lite/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      testMatch: ['**/tests/ui/**/*.spec.ts', '**/tests/e2e/**/*.spec.ts'],
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      testMatch: ['**/tests/ui/**/*.spec.ts', '**/tests/e2e/**/*.spec.ts'],
      use: { ...devices['Desktop Safari'] }
    },
    
  ]
});