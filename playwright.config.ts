import { defineConfig, devices } from '@playwright/test'

// Tests E2E contre le Firebase Emulator Suite — jamais contre le Firestore
// réel (staging/prod partagent le même projet, voir memory
// feedback_test_data_shared_firestore.md). globalSetup seed les données
// après le démarrage des emulators (webServer #1) et avant les tests.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/fixtures/global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'firebase emulators:start --project pmc-v2-e2e --only auth,firestore,storage',
      url: 'http://127.0.0.1:4000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
    },
    {
      command: 'npx vite --mode test --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: 'pipe',
    },
  ],
})
