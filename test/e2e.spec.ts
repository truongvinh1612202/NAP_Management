import path from 'node:path'
import {
  type ElectronApplication,
  type Page,
  type JSHandle,
  _electron as electron,
} from 'playwright'
import type { BrowserWindow } from 'electron'
import {
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
} from 'vitest'

const root = path.join(__dirname, '..')
let electronApp: ElectronApplication
let page: Page

// Điều hướng bằng menu (aria-label = nhãn menu) rồi chờ một phần tử ĐẶC TRƯNG của
// trang đích xuất hiện. Lưu ý: trang "Danh Mục Công Ty" KHÔNG có <h1> ở chế độ đã
// tải xong (h1 chỉ hiện lúc loading), nên phải nhận diện bằng nút đặc trưng của nó.
async function goTo(menuLabel: string, readySelector: string) {
  await page.getByRole('button', { name: menuLabel, exact: true }).first().click()
  await page.waitForSelector(readySelector, { timeout: 20_000 })
}

// Selector nhận diện từng trang đã render xong
const READY = {
  companies: '#btn-thu-nhieu-cong-ty',
  employees: 'h1:has-text("Danh Mục Nhân Viên")',
  tienThu: 'h1:has-text("Quản Lý Tiền Thu")',
  thongKe: 'h1:has-text("Thống Kê Phiếu Thu")',
}

if (process.platform === 'linux') {
  // Bỏ qua trên Linux CI (không có màn hình để chạy Electron)
  test('skip trên linux', () => expect(true).toBe(true))
} else {
  beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox'],
      cwd: root,
      env: { ...process.env, NODE_ENV: 'development' },
    })
    page = await electronApp.firstWindow()

    const mainWin: JSHandle<BrowserWindow> = await electronApp.browserWindow(page)
    await mainWin.evaluate(async (win) => {
      win.webContents.executeJavaScript('console.log("Execute JavaScript with e2e testing.")')
    })

    // Chờ giao diện render xong
    await page.waitForSelector('nav', { timeout: 20_000 })
  }, 60_000)

  afterAll(async () => {
    await page.screenshot({ path: 'test/screenshots/e2e.png' })
    await page.close()
    await electronApp.close()
  })

  describe('[NAP Management] e2e', () => {
    // ── Khởi động & điều hướng ────────────────────────────────────────────────
    test('khởi động: đúng tiêu đề cửa sổ', async () => {
      expect(await page.title()).toBe('NAP Management')
    })

    test('menu hiển thị đủ các mục chính', async () => {
      for (const label of ['Công Ty', 'Nhân Viên', 'Quản Lý Tiền Thu', 'Thống Kê Phiếu']) {
        expect(
          await page.getByRole('button', { name: label, exact: true }).count(),
        ).toBeGreaterThan(0)
      }
    })

    test('mặc định mở trang Danh Mục Công Ty', async () => {
      // Trang Công Ty không có <h1> khi đã tải xong → nhận diện bằng nút đặc trưng
      await page.waitForSelector(READY.companies, { timeout: 20_000 })
      expect(await page.locator(READY.companies).count()).toBe(1)
    })

    test('điều hướng sang Nhân Viên', async () => {
      await goTo('Nhân Viên', READY.employees)
      expect(await page.textContent('h1')).toContain('Danh Mục Nhân Viên')
    })

    test('điều hướng sang Quản Lý Tiền Thu', async () => {
      await goTo('Quản Lý Tiền Thu', READY.tienThu)
      expect(await page.textContent('h1')).toContain('Quản Lý Tiền Thu')
    })

    test('điều hướng sang Thống Kê Phiếu Thu', async () => {
      await goTo('Thống Kê Phiếu', READY.thongKe)
      expect(await page.textContent('h1')).toContain('Thống Kê Phiếu Thu')
    })

    // ── Modal "Thu Nhiều Công Ty" ─────────────────────────────────────────────
    test('mở modal Thu Nhiều Công Ty từ trang Công Ty', async () => {
      await goTo('Công Ty', READY.companies)
      await page.locator('#btn-thu-nhieu-cong-ty').click()

      await page.waitForSelector('h2:has-text("Thu Nhiều Công Ty")', { timeout: 20_000 })
      // Các ô nhập chính phải có mặt
      expect(await page.locator('#bulk-month').count()).toBe(1)
      expect(await page.locator('#bulk-year').count()).toBe(1)
      expect(await page.locator('#bulk-search').count()).toBe(1)
      expect(await page.locator('#btn-bulk-submit').count()).toBe(1)
    })

    test('ô ngày KHÔNG bung lịch khi focus (để gõ được)', async () => {
      const dateInput = page.getByPlaceholder('dd/mm/yyyy')
      await dateInput.click()
      await page.waitForTimeout(250)
      // Popover lịch (có nút "Hôm nay") không được hiện khi chỉ focus vào ô
      expect(await page.getByText('Hôm nay', { exact: true }).count()).toBe(0)
    })

    test('bấm biểu tượng lịch mới bung popover chọn ngày', async () => {
      await page.getByRole('button', { name: 'Mở lịch chọn ngày' }).first().click()
      await page.getByText('Hôm nay', { exact: true }).first().waitFor({ timeout: 10_000 })
      expect(await page.getByText('Hôm nay', { exact: true }).count()).toBeGreaterThan(0)
      // Đóng lại popover (bấm icon lần nữa) để không che ô khi gõ
      await page.getByRole('button', { name: 'Mở lịch chọn ngày' }).first().click()
      await page.waitForTimeout(150)
    })

    test('gõ tay ngày tự định dạng dd/mm/yyyy', async () => {
      const dateInput = page.getByPlaceholder('dd/mm/yyyy')
      await dateInput.click()
      await dateInput.fill('') // xoá ngày mặc định (hôm nay)
      await dateInput.pressSequentially('15012026', { delay: 20 })
      expect(await dateInput.inputValue()).toBe('15/01/2026')
    })

    test('đóng modal bằng phím Escape', async () => {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      expect(await page.locator('h2:has-text("Thu Nhiều Công Ty")').count()).toBe(0)
    })
  })
}
