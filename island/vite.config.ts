import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: { name: '信息島', short_name: '信息島', lang: 'zh-TW', display: 'standalone', start_url: './', background_color: '#F6F1E3', theme_color: '#A8C686', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'], // assets: precached = cache-first
        runtimeCaching: [
          { urlPattern: /\/(data|quiz)\/.*\.json$/, handler: 'NetworkFirst', options: { cacheName: 'articles' } },
          // island art is large: cached when first seen, refreshed in the background when it changes
          { urlPattern: /\/(scenes|eggs)\/.*\.(png|webp|json)$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'art', expiration: { maxEntries: 300 } } },
        ],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
