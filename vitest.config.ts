import { defineConfig } from 'vitest/config'
import path from 'node:path'

// DB test riêng cho e2e (khớp với test/global-setup.ts). Bảo đảm `npm test` KHÔNG
// bao giờ đọc/ghi vào DB thật của người dùng.
const E2E_DB = path.resolve(__dirname, 'test/.e2e.db')

export default defineConfig({
  test: {
    root: __dirname,
    include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    testTimeout: 1000 * 29,
    globalSetup: ['./test/global-setup.ts'],
    env: {
      DATABASE_URL: `file:${E2E_DB}`,
    },
  },
})
