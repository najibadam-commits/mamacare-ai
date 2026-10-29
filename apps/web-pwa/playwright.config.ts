import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 4173)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/**
 * End-to-end tests run against the PRODUCTION build (the service worker only exists there),
 * on an Android Pixel 5 profile. Set E2E_BASE_URL to test an already-running deployment instead
 * (for example the docker compose stack on http://localhost).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false, // each test uses its own browser context; keep it simple and deterministic
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    ...devices['Pixel 5'],
    locale: 'en-GB',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // channel 'chromium' = the full (new headless) Chromium, which supports the Notifications permission
  // that the default headless shell rejects.
  projects: [{ name: 'pixel-5', use: { ...devices['Pixel 5'], channel: 'chromium' } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm exec vite preview --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
