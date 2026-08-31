import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirror the tsconfig path alias (`~/*` → `./src/*`) so unit tests can import
// modules the same way application code does.
export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
