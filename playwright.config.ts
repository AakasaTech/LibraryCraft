import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  // Mobile first: the main project runs at a 375 px wide phone viewport.
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 } } }],
  webServer: {
    command: `pnpm next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/sign-in`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  },
});
