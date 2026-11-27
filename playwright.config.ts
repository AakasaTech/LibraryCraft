import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  // Several Chromiums starting at once on a dev laptop can eat most of a 30 s budget.
  workers: process.env.CI ? 2 : 3,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  // Mobile first: the main project runs at a 375 px wide phone viewport.
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } } }],
  webServer: {
    // Production build: no on-demand compiling, so parallel workers don't time out on cold routes.
    command: `pnpm next build && pnpm next start -p ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "", AUTH_EMAIL_TO_CONSOLE: "1" },
  },
});
