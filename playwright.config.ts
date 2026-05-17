import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60000,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 1 : undefined,

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
    actionTimeout: 15000,
    headless: true
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});