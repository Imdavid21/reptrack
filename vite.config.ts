import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      // The in-app PWAUpdatePrompt decides when it is safe to activate a new
      // worker. In particular, it suppresses activation while a workout draft
      // is resumable, so a deploy cannot replace the app mid-session.
      registerType: 'prompt',
      includeAssets: ['favicon.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Mutable per-user Supabase rows must never fall back to stale
            // service-worker data. Offline writes use the IndexedDB sync queue.
            urlPattern: /^https:\/\/kfifgbqkykyvnrirxwze\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        navigateFallbackDenylist: [/^\/~oauth/],
        // Keep the waiting worker dormant until updateServiceWorker(true) is
        // called by PWAUpdatePrompt.
        skipWaiting: false,
        clientsClaim: true,
      },
      manifest: {
        name: 'Reptrack Fitness',
        short_name: 'Reptrack',
        description: 'Your Personal Health & Fitness Tracker',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        orientation: 'portrait',
        icons: [
          { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react-dom/client"],
    exclude: ["@radix-ui/react-toast"],
    esbuildOptions: { define: { global: 'globalThis' } },
  },
  build: {
    commonjsOptions: { include: [/node_modules/] },
  },
}));
