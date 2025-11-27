import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      types: resolve(__dirname, "./types"),
      lib: resolve(__dirname, "./lib"),
      utils: resolve(__dirname, "./utils"),
      config: resolve(__dirname, "./config"),
      components: resolve(__dirname, "./components"),
      app: resolve(__dirname, "./app"),
    },
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
