import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// `VITE_BASE` is set by the GitHub Pages workflow to "/<repo>/" so that asset
// URLs, the PWA manifest, and the service-worker scope all line up with the
// subpath GH Pages serves us from. Local dev and other hosts fall back to "/".
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Image Resize",
        short_name: "Resize",
        description: "Resize and convert images to WebP, JPEG, or HEIF — entirely on-device.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        scope: base,
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm,svg,png,ico}"],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ],
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@jsquash/jpeg", "@jsquash/webp", "@jsquash/png", "@jsquash/resize", "libheif-js"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
