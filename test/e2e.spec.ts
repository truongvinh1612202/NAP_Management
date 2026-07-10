import path from 'node:path'
import fs from 'node:fs'
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
  await page
    .locator('nav')
    .getByRole('button', { name: menuLabel, exact: true })
    .first()
    .click()
  await page.waitForSelector(readySelector, { timeout: 20_000 })
}

// Selector nhận diện từng trang đã render xong.
// LƯU Ý: trang "Công Ty" và "Nhân Viên" KHÔNG có <h1> ở trạng thái đã tải xong
// (h1 chỉ hiện lúc loading/error) → nhận diện bằng phần tử đặc trưng của trang.
const READY = {
  companies: '#btn-thu-nhieu-cong-ty',
  employees: '[aria-label="Bảng nhân viên"]',
  tienThu: 'h1:has-text("Quản Lý Tiền Thu")',
  thongKe: 'h1:has-text("Thống Kê Phiếu Thu")',
}

if (process.platform === 'linux') {
  // Bỏ qua trên Linux CI (không có màn hình để chạy Electron)
  test('skip trên linux', () => expect(true).toBe(true))
} else {
  beforeAll(async () => {
    // userData RIÊNG cho e2e → không bao giờ đọc/ghi database-config.json hay DB
    // mặc định của app thật (chỉ dùng DB test qua DATABASE_URL từ vitest.config).
    const userDataDir = path.join(root, 'test', '.e2e-userdata')
    fs.rmSync(userDataDir, { recursive: true, force: true })
    fs.mkdirSync(userDataDir, { recursive: true })

    electronApp = await electron.launch({
      args: ['.', '--no-sandbox', `--user-data-dir=${userDataDir}`],
      cwd: root,
      env: { ...process.env, NODE_ENV: 'development' },
    })
    page = await electronApp.firstWindow()

    // Tự đồng ý mọi hộp thoại window.confirm (dùng khi xóa phiếu thu)
    page.on('dialog', (d) => d.accept().catch(() => {}))

    const mainWin: JSHandle<BrowserWindow> = await electronApp.browserWindow(page)
    await mainWin.evaluate(async (win) => {
      win.webContents.executeJavaScript('console.log("Execute JavaScript with e2e testing.")')
    })

    // Chờ giao diện render xong + "làm ấm": trang Công Ty (mặc định) load hẳn và cửa
    // sổ maximize/AG Grid ổn định trước khi bắt đầu click điều hướng (tránh flake
    // cold-start ở lần điều hướng đầu tiên).
    await page.waitForSelector('nav', { timeout: 20_000 })
    await page.waitForSelector(READY.companies, { timeout: 20_000 }).catch(() => {})
    await page.waitForTimeout(1200)
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

    test('điều hướng sang Nhân Viên (lưới nhân viên hiển thị)', async () => {
      await goTo('Nhân Viên', READY.employees)
      expect(await page.locator(READY.employees).count()).toBe(1)
      // Dữ liệu nhân viên (đã seed) hiển thị trong lưới
      await page.getByText('Nguyễn Văn An', { exact: false }).first().waitFor({ timeout: 15_000 })
    }, 40_000)

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

    test('gõ tay ngày: KHÔNG chèn "/" khi đang gõ, định dạng khi rời ô', async () => {
      const dateInput = page.getByPlaceholder('dd/mm/yyyy')
      await dateInput.click()
      await dateInput.fill('') // xoá ngày mặc định (hôm nay)
      await dateInput.pressSequentially('15012026', { delay: 20 })
      // Mới (chống nhảy loạn với bộ gõ tiếng Việt): giữ nguyên chuỗi số khi đang gõ
      expect(await dateInput.inputValue()).toBe('15012026')
      // Rời ô (Enter → blur) mới định dạng thành dd/mm/yyyy
      await dateInput.press('Enter')
      await page.waitForTimeout(200)
      expect(await dateInput.inputValue()).toBe('15/01/2026')
    }, 30_000)

    test('đóng modal bằng phím Escape', async () => {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      expect(await page.locator('h2:has-text("Thu Nhiều Công Ty")').count()).toBe(0)
    })
  })

  // ── Lưu dữ liệu & đồng bộ giữa các trang (edit/delete) ─────────────────────
  describe('[NAP Management] đồng bộ dữ liệu giữa các trang', () => {
    const AMOUNT = '7654321'
    const AMOUNT_TXT = '7.654.321' // định dạng vi-VN (dấu "." ngăn cách nghìn)
    let company = ''

    // Chờ đến khi 1 đoạn text BIẾN MẤT khỏi trang (dùng cho kiểm tra sau khi xóa)
    const waitGone = (txt: string) =>
      page.waitForFunction(
        (t) => !document.body.innerText.includes(t),
        txt,
        { timeout: 15_000 },
      )

    test('Thống Kê: sửa số tiền 1 phiếu → lưu & hiển thị đúng', async () => {
      await goTo('Thống Kê Phiếu', READY.thongKe)

      const firstRow = page.locator('[role="button"][aria-expanded]').first()
      await firstRow.waitFor({ timeout: 20_000 })
      // Tên công ty của dòng đầu (để tìm lại ở trang khác)
      company = (
        await firstRow.locator('.font-bold.text-gray-900').first().innerText()
      ).trim()
      expect(company.length).toBeGreaterThan(0)

      await firstRow.click() // mở panel sửa
      // Ô "Số tiền thu" nay là MoneyInput (type=text, hiển thị dấu "." ngăn cách)
      const amountInput = page.getByPlaceholder('Nhập số tiền...').first()
      await amountInput.waitFor({ timeout: 10_000 })
      await amountInput.fill(AMOUNT)
      // Sau khi nhập, ô phải tự định dạng có dấu "." ngăn cách (MoneyInput)
      await page.waitForFunction(
        (v) =>
          (document.querySelector(
            'input[placeholder="Nhập số tiền..."]',
          ) as HTMLInputElement | null)?.value === v,
        AMOUNT_TXT,
        { timeout: 5_000 },
      )
      await amountInput.press('Tab') // rời ô → updatePayment + invalidate

      // Số tiền đã định dạng phải xuất hiện trong danh sách Thống Kê
      await page.getByText(AMOUNT_TXT, { exact: false }).first().waitFor({ timeout: 15_000 })
    }, 60_000)

    test('Quản Lý Tiền Thu hiển thị CÙNG số tiền (đồng bộ)', async () => {
      await goTo('Quản Lý Tiền Thu', READY.tienThu)
      await page.getByPlaceholder('Tìm nhanh tên công ty, mã số thuế...').fill(company)
      await page.getByText(AMOUNT_TXT, { exact: false }).first().waitFor({ timeout: 15_000 })
      expect(
        await page.getByText(AMOUNT_TXT, { exact: false }).count(),
      ).toBeGreaterThan(0)
    }, 60_000)

    test('Thống Kê: xóa phiếu → biến mất', async () => {
      await goTo('Thống Kê Phiếu', READY.thongKe)
      // Phiếu vừa sửa vẫn là dòng đầu (sort "mới nhất" = id giảm dần)
      const firstRow = page.locator('[role="button"][aria-expanded]').first()
      await firstRow.waitFor({ timeout: 20_000 })
      await firstRow.getByRole('button', { name: 'Xóa phiếu thu' }).click() // confirm tự accept
      await waitGone(AMOUNT_TXT)
      expect(await page.getByText(AMOUNT_TXT, { exact: false }).count()).toBe(0)
    }, 60_000)

    test('Quản Lý Tiền Thu cũng không còn số tiền đó (đồng bộ)', async () => {
      await goTo('Quản Lý Tiền Thu', READY.tienThu)
      await page.getByPlaceholder('Tìm nhanh tên công ty, mã số thuế...').fill(company)
      await waitGone(AMOUNT_TXT)
      expect(await page.getByText(AMOUNT_TXT, { exact: false }).count()).toBe(0)
    }, 60_000)
  })
}
