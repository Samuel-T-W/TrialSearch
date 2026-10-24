import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// TrialSearch web app (plan sections 3, 8, 10).
// No external origins: everything is same-origin static. The service worker
// precaches the app shell AND the data bundles so a full search works offline
// after the first load.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      // Precache the compiled data bundles too (they are same-origin JSON).
      includeManifestIcons: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json,woff2}"],
        // Bundles can be larger than the default 2 MiB cap.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "index.html",
      },
      manifest: {
        name: "TrialSearch",
        short_name: "TrialSearch",
        description: "Private, plain-language clinical trial matching for Massachusetts.",
        theme_color: "#0f766e",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
