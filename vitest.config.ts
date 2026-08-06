import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // tsconfig.json の compilerOptions.paths ("@/*": ["./*"]) と揃える。
      "@": dirname,
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
