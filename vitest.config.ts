import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // server-only is a Next.js guard that fails outside Next's runtime
      'server-only': path.resolve(__dirname, 'src/lib/__tests__/__mocks__/server-only.ts'),
    },
  },
})
