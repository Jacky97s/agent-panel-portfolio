import { defineConfig, devices } from '@playwright/test';

const port = 5173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `rm -rf e2e/.data && mkdir -p e2e/.data && cp -a data/site.json data/github e2e/.data/ && pnpm dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORTFOLIO_DATA: 'e2e/.data',
      PORTFOLIO_DIST: 'e2e/.data/dist-site',
    },
  },
});
