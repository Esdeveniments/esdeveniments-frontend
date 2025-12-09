import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: [
      { find: /^next-intl\/server$/, replacement: resolve(__dirname, "./test/mocks/next-intl-server.ts") },
      { find: /^next-intl$/, replacement: resolve(__dirname, "./test/mocks/next-intl.ts") },
      { find: "types", replacement: resolve(__dirname, "./types") },
      { find: "lib", replacement: resolve(__dirname, "./lib") },
      { find: "utils", replacement: resolve(__dirname, "./utils") },
      { find: "config", replacement: resolve(__dirname, "./config") },
      { find: "components", replacement: resolve(__dirname, "./components") },
      { find: "app", replacement: resolve(__dirname, "./app") },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    css: true,
    include: ["test/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.d.ts",
        ".next/",
        "next.config.js",
      ],
    },
  },
});
