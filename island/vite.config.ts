import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: { name: '信息島', short_name: '信息島', lang: 'zh-TW', display: 'standalone', start_url: './', background_color: '#F6F1E3', theme_color: '#A8C686', icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'], // assets: precached = cache-first
        runtimeCaching: [{ urlPattern: /\/(data|quiz)\/.*\.json$/, handler: 'NetworkFirst', options: { cacheName: 'articles' } }],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
