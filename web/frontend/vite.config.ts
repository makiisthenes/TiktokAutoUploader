import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // During `npm run dev` on the host, proxy /api to the local API container.
    // In production the nginx sidecar handles this.
    proxy: {
      "/api": "http://localhost:8000",
      "/novnc": "http://localhost:6080",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
