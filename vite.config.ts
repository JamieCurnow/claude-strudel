import { defineConfig } from 'vite-plus'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  // The Cloudflare plugin owns the dev server; Vitest runs its own, so leave it out under test.
  plugins: [vue(), tailwindcss(), ...(process.env.VITEST ? [] : [cloudflare()])],
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
    include: ['src/**/*.test.ts', 'shared/**/*.test.ts', 'worker/**/*.test.ts'],
    // Strudel's deps only resolve correctly through their `module` field, so let Vite transform them.
    server: { deps: { inline: [/@strudel\//, /@kabelsalat\//] } },
    alias: {
      '@kabelsalat/web': new URL('./node_modules/@kabelsalat/web/dist/index.mjs', import.meta.url).pathname
    }
  }
})
