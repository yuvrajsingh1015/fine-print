/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/fine-print/",
  plugins: [react(), tailwindcss()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
