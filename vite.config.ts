import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Telegram Mini App is served over HTTPS. For local dev use a tunnel
// (ngrok/cloudflared) pointing at this dev server, then set the public
// URL in public/tonconnect-manifest.json.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { host: true, port: 5173 },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          ton: ["@tonconnect/ui-react", "@ton/ton", "@ton/core"],
          ston: ["@ston-fi/sdk", "@ston-fi/api", "@ston-fi/omniston-sdk", "@ston-fi/omniston-sdk-react"],
        },
      },
    },
  },
});
