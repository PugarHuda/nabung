import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath, URL } from "node:url";

// Telegram Mini App is served over HTTPS. For local dev use a tunnel
// (ngrok/cloudflared) pointing at this dev server, then set the public
// URL in public/tonconnect-manifest.json.
export default defineConfig({
  // GitHub Pages serves under the sub-path /<repo>/. The CI workflow sets VITE_BASE.
  // For Vercel/Cloudflare (root domain) leave the default "/".
  base: process.env.VITE_BASE || "/",
  // @ston-fi / @ton libs use Node's Buffer/process/global — polyfill them for the
  // browser & Telegram WebView (otherwise: "Buffer is not defined" → blank screen).
  plugins: [nodePolyfills({ globals: { Buffer: true, global: true, process: true } }), react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { host: true, port: 5173 },
  build: {
    // Single-vendor bundling avoids cross-chunk circular init order (a black-screen risk
    // in the Telegram WebView). Size warning is fine for a hackathon MVP.
    chunkSizeWarningLimit: 1600,
  },
});
