import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Isolated config for the PS repeatability preliminary. Mirrors the project's
// `~/*` → `./src/*` alias so the runner imports the SAME production modules the
// app does, but only ever collects THIS runner file. It does not touch, import,
// or run any other test, production file, or the historical experiment folder.
export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  test: {
    include: ["psps-prelim/run.ts"],
    // One long-running call batch; no parallelism (keeps call count predictable
    // and avoids rate-limit retries).
    fileParallelism: false,
    testTimeout: 1_800_000,
  },
});
