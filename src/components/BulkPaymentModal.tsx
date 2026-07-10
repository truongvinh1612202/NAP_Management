import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../utils/trpc";
import { X, Search, Square, Building2, CalendarCheck2, Plus, CalendarPlus } from "lucide-react";
import DatePickerVN from "@/components/DatePickerVN";
import { toast } from "@/components/Toast";
import { formatCurrencyVND, dayKeyToNoonIso, normalizeVN } from "@/utils/helper";

// Class tĩnh cho ô thống kê kết quả (Tailwind không sinh class từ chuỗi động)
const STAT_STYLES: Record<string, { box: string; num: string; label: string }> = {
  green: { box: "bg-green-50 border-green-200", num: "text-green-600", label: "text-green-700" },
  yellow: { box: "bg-yellow-50 border-yellow-200", num: "text-yellow-600", label: "text-yellow-700" },
  red: { box: "bg-red-50 border-red-200", num: "text-red-600", label: "text-red-700" },
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

// 1 dòng thu = 1 công ty ở 1 kỳ (tháng/năm). 1 phiếu gồm nhiều dòng → có thể nhiều kỳ.
interface LineItem {
  companyId: number;
  month: number;
  year: number;
}

const periodKey = (companyId: number, month: number, year: number) =>
  `${companyId}-${month}-${year}`;
const periodLabel = (month: number, year: number) =>
  `T${String(month).padStart(2, "0")}/${year}`;

// Khi có `targetBatch` → modal chạy ở chế độ "Thêm công ty vào phiếu có sẵn":
// gắn dòng mới vào batchId đó; `existingItems` để chặn chọn trùng (công ty × kỳ) đã có.
interface TargetBatch {
  batchId: number;
  defaultMonth: number; // gợi ý "kỳ đang chọn" ban đầu (kỳ đại diện của phiếu)
  defaultYear: number;
  collectionDate: string | null; // yyyy-mm-dd
  enteredById: number | null;
  existingItems: LineItem[]; // các dòng đã có trong phiếu
}

interface BulkPaymentModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  targetBatch?: TargetBatch;
}

interface ResultSummary {
  createdCount: number;
  skipped: { name: string; period: string }[];
  failedCount: number;
  periods: string[]; // các kỳ đã tạo, hiển thị ở header kết quả
  batchId: number | null;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function todayYYYYMMDD(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// "yyyy-mm-dd" → ISO ở mốc 12:00 UTC (chống lệch ngày do múi giờ trên máy khác).
function parseISOToTimestamp(isoDate: string): string | null {
  return dayKeyToNoonIso(isoDate);
}

// ─────────────────────────────────────────────────────────────────────────────

const BulkPaymentModal = ({ onClose, onSuccess, targetBatch }: BulkPaymentModalProps) => {
  const queryClient = useQueryClient();
  const today = new Date();
  const isAddMode = targetBatch != null; // thêm vào phiếu có sẵn

  const [collectionDate, setCollectionDate] = useState(
    targetBatch?.collectionDate || todayYYYYMMDD(),
  );
  const [dateError, setDateError] = useState("");
  // "Kỳ đang chọn" — kỳ mặc định khi tick công ty lần đầu.
  const [selectedMonth, setSelectedMonth] = useState(
    targetBatch?.defaultMonth ?? today.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(targetBatch?.defaultYear ?? CURRENT_YEAR);
  const [enteredById, setEnteredById] = useState<number | "">(
    targetBatch?.enteredById ?? "",
  ); // người nhập
  const [note, setNote] = useState(""); // ghi chú phiếu
  const [items, setItems] = useState<LineItem[]>([]); // danh sách dòng (công ty × kỳ)
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<ResultSummary | null>(null);
  // Công ty đang mở ô chọn kỳ (khi tick lại công ty đã có dòng).
  const [periodPickerFor, setPeriodPickerFor] = useState<number | null>(null);
  const [pickerMonth, setPickerMonth] = useState(selectedMonth);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  // Ô tìm công ty để UNCONTROLLED (không bind value) → React KHÔNG ghi đè thuộc tính
  // .value của ô, nên bộ gõ tiếng Việt (Unikey/EVKey) không bị lệch buffer ("nhảy chữ").
  // Ta chỉ ĐỌC value của ô vào state `searchText` để phục vụ lọc/hiển thị danh sách.
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: companyList } = useQuery(trpc.companies.queryOptions());
  const { data: employeeList } = useQuery(trpc.employees.queryOptions());
  const bulkCreate = useMutation(trpc.bulkCreatePayments.mutationOptions());

  const companyById = useMemo(
    () => new Map((companyList ?? []).map((c) => [c.id, c])),
    [companyList],
  );

  // Kỳ đã có sẵn trong phiếu (chế độ thêm) — để chặn chọn trùng.
  const existingKeys = useMemo(
    () =>
      new Set(
        (targetBatch?.existingItems ?? []).map((it) =>
          periodKey(it.companyId, it.month, it.year),
        ),
      ),
    [targetBatch],
  );

  // Lọc KHÔNG DẤU: gõ "cong ty" vẫn khớp "Công Ty" (chuẩn hoá cả 2 phía qua normalizeVN).
  const filteredCompanies = useMemo(() => {
    if (!companyList) return [];
    const q = normalizeVN(searchText.trim());
    if (!q) return companyList;
    return companyList.filter(
      (c) => normalizeVN(c.companyName).includes(q) || normalizeVN(c.taxId).includes(q)
    );
  }, [companyList, searchText]);

  // (công ty, kỳ) đã bị chiếm = đã có trong dòng đang chọn HOẶC đã tồn tại trong phiếu.
  const isTaken = (companyId: number, month: number, year: number) =>
    existingKeys.has(periodKey(companyId, month, year)) ||
    items.some((it) => it.companyId === companyId && it.month === month && it.year === year);

  const isTakenIn = (list: LineItem[], companyId: number, month: number, year: number) =>
    existingKeys.has(periodKey(companyId, month, year)) ||
    list.some((it) => it.companyId === companyId && it.month === month && it.year === year);

  // Số kỳ đã CHỌN cho công ty (trong phiếu đang dựng) và số kỳ đã CÓ sẵn (chế độ thêm).
  const selectedCountFor = (id: number) => items.filter((it) => it.companyId === id).length;
  const existingCountFor = (id: number) =>
    (targetBatch?.existingItems ?? []).filter((it) => it.companyId === id).length;

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (periodPickerFor != null) setPeriodPickerFor(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose, periodPickerFor]);

  const addItem = (companyId: number, month: number, year: number) => {
    setItems((prev) =>
      isTakenIn(prev, companyId, month, year)
        ? prev
        : [...prev, { companyId, month, year }],
    );
  };

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  // Tick 1 công ty: lần đầu → thêm ở kỳ đang chọn; nếu đã có dòng (hoặc kỳ đang chọn đã
  // bị chiếm) → mở ô chọn kỳ để chọn kỳ khác.
  const handlePickCompany = (companyId: number) => {
    const hasItems = selectedCountFor(companyId) > 0;
    const currentTaken = isTaken(companyId, selectedMonth, selectedYear);
    if (!hasItems && !currentTaken) {
      addItem(companyId, selectedMonth, selectedYear);
      return;
    }
    // Mở ô chọn kỳ; mặc định = kỳ đang chọn (nếu trống) hoặc kỳ chưa bị chiếm gần nhất.
    let m = selectedMonth;
    let y = selectedYear;
    if (isTaken(companyId, m, y)) {
      const free = MONTHS.find((mm) => !isTaken(companyId, mm, selectedYear));
      if (free) m = free;
    }
    setPickerMonth(m);
    setPickerYear(y);
    setPeriodPickerFor(companyId);
  };

  const confirmPeriodPick = () => {
    if (periodPickerFor == null) return;
    if (isTaken(periodPickerFor, pickerMonth, pickerYear)) {
      toast.error(`Kỳ ${periodLabel(pickerMonth, pickerYear)} đã có cho công ty này`);
      return;
    }
    addItem(periodPickerFor, pickerMonth, pickerYear);
    setPeriodPickerFor(null);
  };

  // Chọn tất cả (kỳ đang chọn) cho mọi công ty đang lọc chưa có kỳ đó; nếu đã đủ → xóa hết.
  const allHaveCurrent =
    filteredCompanies.length > 0 &&
    filteredCompanies.every((c) => isTaken(c.id, selectedMonth, selectedYear));

  // Thêm dòng ở kỳ đang chọn cho MỌI công ty đang khớp tìm kiếm (chưa có kỳ đó).
  const addAllCurrent = () => {
    setItems((prev) => {
      const additions = filteredCompanies
        .filter((c) => !isTakenIn(prev, c.id, selectedMonth, selectedYear))
        .map((c) => ({ companyId: c.id, month: selectedMonth, year: selectedYear }));
      return [...prev, ...additions];
    });
  };

  const handleDateChange = (val: string) => {
    setCollectionDate(val);
    setDateError("");
  };

  // Tổng tạm tính = tổng serviceFee của các dòng.
  const provisionalTotal = useMemo(
    () =>
      items.reduce((sum, it) => sum + (companyById.get(it.companyId)?.serviceFee ?? 0), 0),
    [items, companyById],
  );

  const distinctCompanyCount = useMemo(
    () => new Set(items.map((it) => it.companyId)).size,
    [items],
  );

  const handleSubmit = async () => {
    if (!collectionDate) { setDateError("Vui lòng chọn ngày thu"); return; }
    const isoDate = parseISOToTimestamp(collectionDate);
    if (!isoDate) { setDateError("Ngày không hợp lệ"); return; }
    if (items.length === 0) return;

    try {
      const res = await bulkCreate.mutateAsync({
        items,
        collectionDate: isoDate,
        note: note.trim() || null,
        enteredById: enteredById === "" ? null : enteredById,
        ...(isAddMode ? { batchId: targetBatch.batchId } : {}),
      });

      setResult({
        createdCount: res.createdCount,
        skipped: res.skipped.map((s) => ({
          name: companyById.get(s.companyId)?.companyName ?? `ID ${s.companyId}`,
          period: periodLabel(s.month, s.year),
        })),
        failedCount: res.failedCount,
        periods: res.periods,
        batchId: res.batchId,
      });

      await queryClient.invalidateQueries({ queryKey: [["payments"]] });
      await queryClient.invalidateQueries({ queryKey: [["companiesWithPayments"]] });

      if (res.createdCount > 0) {
        toast.success(
          isAddMode
            ? `Đã thêm ${res.createdCount} dòng vào phiếu #${targetBatch.batchId}`
            : `Đã thu ${res.createdCount} dòng (${res.periods.join(", ")})`,
        );
      }
      onSuccess?.();
    } catch (err) {
      console.error("bulkCreatePayments error:", err);
      toast.error("Thu nhiều công ty thất bại. Vui lòng thử lại.");
    }
  };

  const handleClose = () => { setResult(null); onClose(); };

  // ── Result screen ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4"
        onClick={handleClose}>
        <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md p-6 sm:p-8 flex flex-col items-center gap-4 sm:gap-6"
          onClick={(e) => e.stopPropagation()}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CalendarCheck2 size={24} className="sm:w-6 sm:h-6 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Hoàn thành!</h3>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
              {result.periods.length > 0 && (
                <span className="font-semibold text-gray-800">{result.periods.join(", ")}</span>
              )}
              {result.batchId != null && (
                <>
                  {result.periods.length > 0 && " · "}
                  <span className="font-semibold text-gray-800">Phiếu #{result.batchId}</span>
                </>
              )}
            </p>
          </div>
          <div className="w-full grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Đã tạo", count: result.createdCount, color: "green" },
              { label: "Bỏ qua", count: result.skipped.length, color: "yellow" },
              { label: "Lỗi",    count: result.failedCount,   color: "red"   },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                className={`rounded-lg border p-2.5 sm:p-3 text-center ${STAT_STYLES[color].box}`}
              >
                <p className={`text-xl sm:text-2xl font-bold ${STAT_STYLES[color].num}`}>{count}</p>
                <p className={`text-xs font-semibold mt-0.5 ${STAT_STYLES[color].label}`}>{label}</p>
              </div>
            ))}
          </div>
          {result.skipped.length > 0 && (
            <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 sm:p-3">
              <p className="text-xs font-semibold text-yellow-800 mb-1.5">Dòng bỏ qua (đã có dữ liệu):</p>
              <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                {result.skipped.map((s, i) => (
                  <li key={`${s.name}-${s.period}-${i}`} className="text-xs text-yellow-700">
                    • {s.name} · {s.period}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="w-full py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm focus:outline-none"
            onClick={handleClose}>Đóng</button>
        </div>
      </div>
    );
  }

  const canSubmit = items.length > 0 && collectionDate.length === 10 && !dateError;
  const isSearching = searchText.trim().length > 0; // tìm-trước-rồi-chọn: chỉ hiện list khi đang tìm

  // ── Main form ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4"
    >
      {/*
        Modal: responsive sizing for different screen resolutions.
        Layout: header (shrink-0) | fields (shrink-0) | company-section (flex-1, min-h-0) | footer (shrink-0)
      */}
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-h-[94vh] max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── (shrink-0) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center shrink-0 shadow-md shadow-green-100">
              <Building2 size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-gray-900 leading-tight">
                {isAddMode ? "Thêm Công Ty Vào Phiếu" : "Thu Nhiều Công Ty"}
              </h2>
              {isAddMode && (
                <p className="text-xs font-semibold text-gray-500 leading-tight truncate">
                  Phiếu #{targetBatch.batchId} · có thể thu nhiều kỳ (T/Q)
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-all focus:outline-none shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* ── Form fields ── (shrink-0) — gom gọn để list công ty rộng hơn */}
        <div className="px-4 sm:px-6 py-2 border-b border-gray-100 shrink-0 space-y-2">
          {/* Hàng 1: Ngày thu · Tháng · Năm (kỳ đang chọn) */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1.4fr_1fr_1fr]">
            {/* Ngày thu */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                Ngày thu <span className="text-red-500">*</span>
              </label>
              <DatePickerVN
                value={collectionDate}
                onChange={handleDateChange}
                fallbackYear={selectedYear}
                className="w-full"
                inputClassName="w-full pr-2 py-1.5 focus:outline-none text-sm font-semibold text-gray-900 bg-transparent placeholder-gray-400"
              />
              {dateError && <p className="text-xs text-red-500 mt-0.5 font-bold">⚠ {dateError}</p>}
            </div>

            {/* Tháng (kỳ đang chọn) */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                Kỳ · Tháng <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-900 hover:border-gray-400 transition-all shadow-sm cursor-pointer"
                id="bulk-month"
                aria-label="Tháng của kỳ đang chọn"
              >
                {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            </div>

            {/* Năm (kỳ đang chọn) */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                Kỳ · Năm <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-900 hover:border-gray-400 transition-all shadow-sm cursor-pointer"
                id="bulk-year"
                aria-label="Năm của kỳ đang chọn"
              >
                {YEARS.map((y) => <option key={y} value={y}>Năm {y}</option>)}
              </select>
            </div>
          </div>

          {/* Hàng 2: Người nhập · Ghi chú phiếu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                Người nhập
              </label>
              <select
                value={enteredById}
                onChange={(e) =>
                  setEnteredById(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-900 hover:border-gray-400 transition-all shadow-sm cursor-pointer"
                aria-label="Người nhập"
              >
                <option value="">— Chọn người nhập —</option>
                {employeeList?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                Ghi chú phiếu
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tên/ghi chú cho phiếu (tùy chọn)"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-400 transition-all shadow-sm"
                aria-label="Ghi chú phiếu"
              />
            </div>
          </div>
        </div>

        {/* ── Company section ── (flex-1, takes remaining height) */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden px-4 sm:px-6 py-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2 shrink-0 gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
              Chọn công ty <span className="text-red-500">*</span>
              {items.length > 0 && (
                <span className="px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-black shadow-sm">
                  {items.length} dòng
                </span>
              )}
            </span>
            {/* Chọn tất cả CHỈ áp cho kết quả đang tìm (khi list hiển thị) */}
            {isSearching && !allHaveCurrent && (
              <button
                type="button"
                onClick={addAllCurrent}
                className="text-sm text-green-600 hover:text-green-800 font-bold focus:outline-none border-b-2 border-transparent hover:border-green-600 transition-all"
              >
                {`Chọn tất cả kết quả · ${periodLabel(selectedMonth, selectedYear)}`}
              </button>
            )}
          </div>

          {/* Danh sách DÒNG đã chọn (công ty × kỳ) — gỡ từng dòng. Khi CHƯA tìm →
              giãn cao (flex-1) để dễ soát; khi đang tìm → thu gọn nhường chỗ cho list. */}
          {items.length > 0 && (
            <div className={`${isSearching ? "shrink-0" : "flex-1 min-h-0"} flex flex-col mb-1.5`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500">
                  Các dòng sẽ thu (công ty · kỳ):
                </p>
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-xs font-bold text-red-500 hover:text-red-700 focus:outline-none"
                >
                  Xóa hết
                </button>
              </div>
              <div
                className={`flex flex-wrap content-start gap-1.5 ${
                  isSearching ? "max-h-24" : "flex-1 min-h-0"
                } overflow-y-auto p-1.5 bg-green-50/60 border border-green-100 rounded-lg`}
              >
                {items.map((it, i) => {
                  const c = companyById.get(it.companyId);
                  if (!c) return null;
                  return (
                    <span
                      key={`${periodKey(it.companyId, it.month, it.year)}-${i}`}
                      className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 bg-white border border-green-200 rounded-full text-xs font-semibold text-gray-700 shadow-sm"
                    >
                      <span className="w-5 h-5 shrink-0 rounded-full bg-green-600 text-white text-[10px] font-black flex items-center justify-center leading-none">
                        {i + 1}
                      </span>
                      <span className="truncate max-w-[140px]">{c.companyName}</span>
                      <span className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold whitespace-nowrap">
                        {periodLabel(it.month, it.year)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        title="Gỡ dòng"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ô chọn kỳ (khi tick lại công ty đã có dòng) */}
          {periodPickerFor != null && (
            <div className="mb-2 shrink-0 flex items-center gap-2 flex-wrap p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs font-bold text-blue-800 truncate max-w-[160px]">
                <CalendarPlus size={13} className="inline mr-1 -mt-0.5" />
                Thêm kỳ cho: {companyById.get(periodPickerFor)?.companyName}
              </span>
              <select
                value={pickerMonth}
                onChange={(e) => setPickerMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer"
                aria-label="Tháng cần thêm"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m} disabled={isTaken(periodPickerFor, m, pickerYear)}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={pickerYear}
                onChange={(e) => setPickerYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer"
                aria-label="Năm cần thêm"
              >
                {YEARS.map((y) => <option key={y} value={y}>Năm {y}</option>)}
              </select>
              <button
                type="button"
                onClick={confirmPeriodPick}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
              >
                <Plus size={13} /> Thêm kỳ
              </button>
              <button
                type="button"
                onClick={() => setPeriodPickerFor(null)}
                className="px-2 py-1 text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                Hủy
              </button>
            </div>
          )}

          {/* Search — gõ tên rồi nhấn Enter để chọn nhanh công ty đầu tiên (ở kỳ đang chọn) */}
          <div className="relative mb-2 shrink-0 max-w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              defaultValue=""
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  const next = filteredCompanies.find(
                    (c) => !isTaken(c.id, selectedMonth, selectedYear),
                  );
                  if (next) {
                    addItem(next.id, selectedMonth, selectedYear);
                    setSearchText("");
                    if (searchRef.current) searchRef.current.value = "";
                  }
                }
              }}
              placeholder="Gõ tên công ty, MST… (Enter = thêm nhanh ở kỳ đang chọn)"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-400 transition-all shadow-sm"
              id="bulk-search"
            />
          </div>

          {/* Danh sách công ty CHỈ hiện khi đang tìm (tìm-trước-rồi-chọn). Chưa tìm →
              ẩn list, nhường chỗ cho khung "dòng đã chọn" ở trên. */}
          {!isSearching ? (
            // Chưa tìm: nếu chưa có dòng nào thì gợi ý; nếu có rồi thì không chiếm chỗ
            // (khung "dòng đã chọn" đã flex-1 ở trên).
            items.length === 0 ? (
              <div className="flex-1 min-h-[120px] flex flex-col items-center justify-center gap-2 text-center border border-dashed border-gray-300 rounded-lg bg-gray-50/40 px-4">
                <Search size={26} className="text-gray-300" />
                <p className="text-sm font-semibold text-gray-400">
                  Gõ tên công ty / MST để tìm và chọn
                </p>
                <p className="text-xs text-gray-400">
                  Mẹo: gõ tên rồi nhấn <span className="font-bold">Enter</span> để thêm nhanh ở kỳ đang chọn
                </p>
              </div>
            ) : null
          ) : (
          <div className="flex-1 min-h-[300px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 shadow-inner bg-gray-50/30">
            {!companyList || companyList.length === 0 ? (
              <div className="p-4 text-center text-gray-400 font-medium text-sm">Đang tải...</div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-400 font-medium text-sm">Không tìm thấy công ty</p>
              </div>
            ) : (
              filteredCompanies.map((company) => {
                const count = selectedCountFor(company.id);
                const existCount = existingCountFor(company.id);
                return (
                  <button
                    type="button"
                    key={company.id}
                    onClick={() => handlePickCompany(company.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 h-[52px] cursor-pointer transition-colors ${
                      count > 0 ? "bg-green-50/80 hover:bg-green-50" : "bg-white hover:bg-gray-50"
                    }`}
                    title={count > 0 ? "Bấm để thêm kỳ khác" : "Bấm để thu ở kỳ đang chọn"}
                  >
                    {count > 0 ? (
                      <span
                        className="w-6 h-6 shrink-0 rounded-md bg-green-600 text-white text-xs font-black flex items-center justify-center leading-none shadow-sm"
                        title={`${count} kỳ đã chọn`}
                      >
                        {count}
                      </span>
                    ) : (
                      <Square size={20} className="text-gray-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{company.companyName}</p>
                      <p className="text-[11px] text-gray-500 font-medium truncate leading-tight">
                        {company.taxId}
                        {existCount > 0 && (
                          <span className="ml-1 text-blue-600">· đã có {existCount} kỳ trong phiếu</span>
                        )}
                      </p>
                    </div>
                    {company.serviceFee != null && (
                      <span className="text-sm font-bold text-gray-700 shrink-0 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm whitespace-nowrap">
                        {formatCurrencyVND(company.serviceFee)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          )}
        </div>

        {/* ── Footer ── (shrink-0) */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between flex-wrap sm:flex-nowrap shrink-0 gap-3 bg-gray-50/80 rounded-b-xl">
          <p className="text-sm text-gray-600 font-bold w-full sm:w-auto truncate">
            {items.length === 0
              ? "Chưa chọn dòng nào"
              : `${items.length} dòng · ${distinctCompanyCount} công ty · ${formatCurrencyVND(provisionalTotal || null)}`}
          </p>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-gray-600 border border-gray-300 rounded-lg hover:bg-white hover:shadow-md transition-all focus:outline-none"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || bulkCreate.isPending}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5 transition-all font-black focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
              id="btn-bulk-submit"
            >
              {bulkCreate.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CalendarCheck2 size={18} />
                  <span>
                    {isAddMode ? "Thêm vào phiếu" : "Thu tiền"}
                    {items.length > 0 ? ` (${items.length})` : ""}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPaymentModal;
