import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = process.env.VITE_BASE_PATH || '/';
const target = process.env.BUILD_TARGET; // 'pay' | 'kiosk' | 'admin' | 'partner' | 'ops'

function targetEntryPlugin(target?: string) {
  const titles: Record<string, string> = {
    pay: 'SoulPay - 스마트 수납 & 모바일 헌금',
    kiosk: 'SoulPay Kiosk - 현장 무인 헌금함',
    admin: 'SoulPay Admin - 단체 관리자 포털',
    partner: 'SoulPay Partner - 영업 파트너 포털',
    ops: 'SoulPay Ops - 시스템 관리자',
    dev: 'SoulPay [Dev/Staging] - 통합 테스트 환경',
  };

  return {
    name: 'vite-plugin-target-entry',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (target && target !== 'dev' && (id.endsWith('/src/main.tsx') || id.endsWith('src/main.tsx') || id === '/src/main.tsx')) {
        return path.resolve(__dirname, `src/entries/${target}.tsx`);
      }
      return null;
    },
    transformIndexHtml(html: string) {
      let transformed = html;
      if (target && titles[target]) {
        transformed = transformed.replace(/<title>.*?<\/title>/, `<title>${titles[target]}</title>`);
      }
      return transformed;
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    targetEntryPlugin(target),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'SoulPay',
        short_name: 'SoulPay',
        description: '헌금 및 기부 SaaS 플랫폼',
        theme_color: '#1a1a2e',
        background_color: '#ffffff',
        display: 'standalone',
        scope: basePath,
        start_url: basePath,
        lang: 'ko',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/system\/admin\/.*/, /^https:\/\/.*\.supabase\.co\/.*/],
        runtimeCaching: [
          {
            // Supabase API 및 백엔드 API — 캐시하지 않고 즉시 직통
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },

          {
            // 정적 이미지 자산 — 캐시 우선
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'soulpay-images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    outDir: target ? `dist/${target}` : 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
          ],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
