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
  phiDv: 'h1:has-text("Quản Lý Phí Dịch Vụ")',
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

    test('Chi tiết NV: mở modal có tiêu đề + bộ lọc kỳ (Tháng/Năm)', async () => {
      await goTo('Nhân Viên', READY.employees)
      // Nút "Chi tiết" có aria-label "Xem công ty phụ trách của <tên>"
      await page.getByRole('button', { name: 'Xem công ty phụ trách' }).first().click()
      // Modal hiện tiêu đề "Công Ty Phụ Trách"
      await page.getByText('Công Ty Phụ Trách', { exact: false }).first().waitFor({ timeout: 15_000 })
      // Bộ lọc kỳ luôn hiển thị (không phụ thuộc dữ liệu)
      expect(await page.getByLabel('Chọn tháng').count()).toBeGreaterThan(0)
      expect(await page.getByLabel('Chọn năm').count()).toBeGreaterThan(0)
      // Đóng modal
      await page.getByRole('button', { name: 'Đóng', exact: true }).first().click()
      await page.waitForTimeout(200)
      expect(await page.getByText('Công Ty Phụ Trách', { exact: false }).count()).toBe(0)
    }, 40_000)

    test('điều hướng sang Quản Lý Tiền Thu', async () => {
      await goTo('Quản Lý Tiền Thu', READY.tienThu)
      expect(await page.textContent('h1')).toContain('Quản Lý Tiền Thu')
    })

    test('điều hướng sang Thống Kê Phiếu Thu', async () => {
      await goTo('Thống Kê Phiếu', READY.thongKe)
      expect(await page.textContent('h1')).toContain('Thống Kê Phiếu Thu')
    })

    test('Quản Lý Phí DV: mở trang → có cột Trạng Thái + nút Xuất Excel', async () => {
      await goTo('Quản Lý Phí DV', READY.phiDv)
      expect(await page.textContent('h1')).toContain('Quản Lý Phí Dịch Vụ')
      // Nút xuất Excel có mặt
      expect(await page.getByRole('button', { name: 'Xuất Excel' }).count()).toBe(1)
      // Lưới có cột Trạng Thái + NV Dịch Vụ KH (tiêu đề cột AG Grid)
      await page.getByText('Trạng Thái', { exact: true }).first().waitFor({ timeout: 15_000 })
      expect(await page.getByText('NV Dịch Vụ KH', { exact: true }).count()).toBeGreaterThan(0)
    }, 40_000)

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

    // ── Modal "Nhập phiếu từ Excel" ───────────────────────────────────────────
    test('mở modal Nhập phiếu từ Excel + có nút Tải file mẫu', async () => {
      await goTo('Công Ty', READY.companies)
      await page.locator('#btn-nhap-phieu-excel').click()
      await page.waitForSelector('h2:has-text("Nhập phiếu thu từ Excel")', { timeout: 20_000 })
      // Nút tải mẫu + nút nhập phải có mặt
      expect(await page.getByRole('button', { name: 'Tải file mẫu' }).count()).toBe(1)
      expect(await page.locator('#btn-import-payments-submit').count()).toBe(1)
      // Đóng bằng nút Hủy
      await page.getByRole('button', { name: 'Hủy', exact: true }).first().click()
      await page.waitForTimeout(250)
      expect(await page.locator('h2:has-text("Nhập phiếu thu từ Excel")').count()).toBe(0)
    })

    // ── Bảng kê theo Nhân Viên (Quản Lý Tiền Thu) ─────────────────────────────
    test('Bảng kê theo NV: bấm nút mới hiện ô chọn nhân viên; nút Xuất mờ khi chưa chọn', async () => {
      await goTo('Quản Lý Tiền Thu', READY.tienThu)
      // Popover CHƯA hiện → không có nút "Xuất Excel"
      expect(
        await page.getByRole('button', { name: 'Xuất Excel', exact: true }).count(),
      ).toBe(0)

      // Bấm nút "Bảng kê theo NV" → popover chọn nhân viên hiện ra
      await page.getByRole('button', { name: 'Bảng kê theo NV' }).click()
      const exportBtn = page.getByRole('button', { name: 'Xuất Excel', exact: true })
      await exportBtn.waitFor({ timeout: 10_000 })

      // Có ô chọn nhân viên (kèm option mặc định)
      const select = page
        .locator('select')
        .filter({ hasText: '— Chọn nhân viên —' })
      expect(await select.count()).toBe(1)

      // Chưa chọn nhân viên → nút Xuất Excel bị mờ (disabled)
      expect(await exportBtn.isDisabled()).toBe(true)

      // Chọn 1 nhân viên → nút Xuất Excel bật lên (enabled)
      await select.selectOption({ index: 1 })
      await page.waitForTimeout(150)
      expect(await exportBtn.isDisabled()).toBe(false)

      // Bấm ra ngoài (nền phủ trong suốt) → popover đóng lại
      await page.mouse.click(100, 600)
      await page.waitForTimeout(250)
      expect(
        await page.getByRole('button', { name: 'Xuất Excel', exact: true }).count(),
      ).toBe(0)
    }, 40_000)

    // ── Sửa kỳ (T/Q) ở Thống Kê Phiếu — CHỈ trong panel mở rộng ───────────────
    test('Sửa T/Q: mở dòng → panel có ô chọn Kỳ (Tháng T01–T12)', async () => {
      await goTo('Thống Kê Phiếu', READY.thongKe)
      const firstRow = page.locator('[role="button"][aria-expanded]').first()
      await firstRow.waitFor({ timeout: 20_000 })

      // Chưa mở dòng → chưa có ô chọn tháng
      expect(await page.getByLabel('Chọn tháng').count()).toBe(0)

      // Bấm mở dòng → panel hiện ô "Kỳ (T/Q)" với <select> tháng có tới option T12
      await firstRow.click()
      const monthSelect = page.getByLabel('Chọn tháng').first()
      await monthSelect.waitFor({ timeout: 10_000 })
      expect(
        await monthSelect.locator('option', { hasText: 'T12' }).count(),
      ).toBeGreaterThan(0)

      // Đóng dòng → ô chọn tháng biến mất
      await firstRow.click()
      await page.waitForTimeout(200)
      expect(await page.getByLabel('Chọn tháng').count()).toBe(0)
    }, 40_000)
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
      await firstRow.getByRole('button', { name: 'Xóa phiếu thu' }).click()
      // Hộp xác nhận IN-APP (thay window.confirm) → bấm nút "Xóa"
      await page.getByRole('alertdialog').getByRole('button', { name: 'Xóa', exact: true }).click()
      await waitGone(AMOUNT_TXT)
      expect(await page.getByText(AMOUNT_TXT, { exact: false }).count()).toBe(0)
    }, 60_000)

    test('Quản Lý Tiền Thu cũng không còn số tiền đó (đồng bộ)', async () => {
      await goTo('Quản Lý Tiền Thu', READY.tienThu)
      await page.getByPlaceholder('Tìm nhanh tên công ty, mã số thuế...').fill(company)
      await waitGone(AMOUNT_TXT)
      expect(await page.getByText(AMOUNT_TXT, { exact: false }).count()).toBe(0)
    }, 60_000)

    // Sửa KỲ (T/Q) ở Thống Kê phải lan sang báo cáo khác (nguồn duy nhất = Payment).
    // Đổi NĂM sang currentYear-5 (gần như chắc trống → không đụng ràng buộc trùng kỳ),
    // rồi kiểm Quản Lý Tiền Thu lọc đúng năm đó có hiện công ty.
    test('Sửa T/Q ở Thống Kê → Quản Lý Tiền Thu phản ánh (đồng bộ kỳ)', async () => {
      const NEW_YEAR = new Date().getFullYear() - 5

      await goTo('Thống Kê Phiếu', READY.thongKe)
      const firstRow = page.locator('[role="button"][aria-expanded]').first()
      await firstRow.waitFor({ timeout: 20_000 })
      const comp = (
        await firstRow.locator('.font-bold.text-gray-900').first().innerText()
      ).trim()
      expect(comp.length).toBeGreaterThan(0)

      // Mở dòng → panel "Kỳ (T/Q)"; đổi Năm sang NEW_YEAR (lưu ngay khi đổi select)
      await firstRow.click()
      const yearSelect = page.getByLabel('Chọn năm').first()
      await yearSelect.waitFor({ timeout: 10_000 })
      await yearSelect.selectOption(String(NEW_YEAR))
      // Chờ updatePayment + invalidate (SQLite cục bộ, nhanh)
      await page.waitForTimeout(900)

      // Sang Quản Lý Tiền Thu, lọc đúng NEW_YEAR → công ty phải xuất hiện
      await goTo('Quản Lý Tiền Thu', READY.tienThu)
      await page.locator('select').filter({ hasText: 'Năm' }).selectOption(String(NEW_YEAR))
      await page.getByPlaceholder('Tìm nhanh tên công ty, mã số thuế...').fill(comp)
      await page.getByText(comp, { exact: false }).first().waitFor({ timeout: 15_000 })
      expect(await page.getByText(comp, { exact: false }).count()).toBeGreaterThan(0)
    }, 60_000)
  })
}
