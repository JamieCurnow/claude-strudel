import { defineConfig } from 'vite-plus'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [vue(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '#shared': new URL('./shared', import.meta.url).pathname
    }
  },
  build: {
    // Strudel + hydra are big; we don't care about the warning for a single-page instrument.
    chunkSizeWarningLimit: 4000
  },
  fmt: {
    semi: false,
    singleQuote: true,
    printWidth: 110,
    trailingComma: 'none',
    arrowParens: 'always',
    ignorePatterns: ['worker/prompt/generated/**', 'worker/worker-configuration.d.ts', 'package-lock.json']
  },
  lint: {
    ignorePatterns: ['dist/**', 'worker/prompt/generated/**', 'worker/worker-configuration.d.ts'],
    options: { typeAware: true, typeCheck: true }
  },
  test: {
    include: ['src/**/*.test.ts', 'shared/**/*.test.ts', 'worker/**/*.test.ts']
  }
})
