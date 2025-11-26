// vite.config.ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["chunk-QO4NA2F3.js"],
  },
  server: {
    port: 5190,
  },
  // @ts-expect-error - Vitest configuration
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    exclude: [
      "**/node_modules/**",
      "**/e2e/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/src/**/__tests__/test-utils.tsx",
    ],
    include: [
      "**/src/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "**/src/**/__tests__/**/*.{js,ts,jsx,tsx}",
    ],
  },
});
