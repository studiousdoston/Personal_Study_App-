import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        name: "BrainMaxx",
        short_name: "BrainMaxx",
        description: "Flashcards with spaced repetition and quizzes for daily study.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f8f6f1",
        theme_color: "#2f7d5b",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
  preview: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8010",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
