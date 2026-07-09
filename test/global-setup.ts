import { execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

// DB test riêng cho e2e — KHÔNG bao giờ đụng vào DB thật của người dùng.
// Phải khớp với test.env.DATABASE_URL trong vitest.config.ts.
const DB_PATH = path.resolve(__dirname, '.e2e.db')
const DB_URL = `file:${DB_PATH}`
const ROOT = path.resolve(__dirname, '..')

function run(cmd: string, env: NodeJS.ProcessEnv) {
  try {
    execSync(cmd, { cwd: ROOT, env, stdio: 'pipe' })
  } catch (e: any) {
    console.error(
      `[e2e global-setup] LỖI khi chạy: ${cmd}\n`,
      e.stdout?.toString?.() ?? '',
      e.stderr?.toString?.() ?? '',
    )
    throw e
  }
}

// Vitest gọi hàm default trước khi chạy test; giá trị trả về là hàm teardown.
export default async function setup() {
  // Xóa DB test cũ để bắt đầu sạch
  for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    if (fs.existsSync(f)) fs.rmSync(f)
  }

  const env = { ...process.env, DATABASE_URL: DB_URL }
  // Tạo schema + seed dữ liệu mẫu (30 công ty, 15 nhân viên, payments 2026)
  run('npx prisma migrate deploy', env)
  run('npx tsx scripts/seedData.ts --reset', env)

  // Giữ lại file DB sau khi chạy để tiện debug (sẽ bị xóa/ghi đè ở lần chạy sau)
  return async () => {}
}
