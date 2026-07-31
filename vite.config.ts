import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.png", "pwa-icons/apple-touch-icon.png"],
      manifest: {
        name: "TikitiMW \u2014 Event Tickets for Malawi",
        short_name: "TikitiMW",
        description: "Discover and book tickets for concerts, sports, conferences and cultural events across Malawi.",
        theme_color: "#B01E2E",
        background_color: "#B01E2E",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes("supabase.co") && url.pathname.includes("/rest/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

