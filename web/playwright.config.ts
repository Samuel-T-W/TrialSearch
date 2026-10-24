import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const HOST = "127.0.0.1";

// Playwright drives the built app served by `vite preview` on localhost only.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "off",
    // Mobile-first: emulate a 375px-wide phone viewport.
    viewport: { width: 375, height: 812 },
  },
  projects: [{ name: "mobile", use: { ...devices["iPhone SE"] } }],
  webServer: {
    command: "npm run preview",
    url: `http://${HOST}:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
