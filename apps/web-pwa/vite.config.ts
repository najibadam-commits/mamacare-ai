import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** The strict CSP in index.html would block Vite's dev server (HMR socket, inline preamble), so relax it for `vite dev` only. */
const devCsp = (): Plugin => ({
  name: 'mamacare-dev-csp',
  transformIndexHtml: {
    order: 'pre',
    handler(html, ctx) {
      if (!ctx.server) return html
      return html.replace(
        /(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")/,
        `$1default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: http:; img-src 'self' data: blob:$2`,
      )
    },
  },
})

export default defineConfig(({ mode }) => {
  // RAG backend (services/rag-engine). Override with VITE_RAG_API_URL in .env.local.
  const env = loadEnv(mode, '.', '')
  const ragTarget = env.VITE_RAG_API_URL || 'http://localhost:8000'
  const apiProxy = { '/api': { target: ragTarget, changeOrigin: true } }

  // Sub-path hosting (e.g. GitHub Pages at /mamacare-ai/): build with VITE_BASE=/mamacare-ai/. Defaults to '/'.
  const base = (process.env.VITE_BASE || '/').replace(/\/?$/, '/')

  return {
  base,
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  plugins: [
    devCsp(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'favicon-48.png', 'apple-touch-icon.png', 'logo-mark.png'],
      manifest: {
        name: 'MamaCare AI',
        short_name: 'MamaCare',
        description: 'Maternal health guides, appointments and care directory - works offline.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F8FAFC',
        theme_color: '#0B3C5D',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell, icons and static assets (kept well under the 5 MB target).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        // API calls must never be answered with the app shell.
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['sw-notification-click.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
}
})
