import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../utils/trpc";
import { X, Search, Square, Building2, CalendarCheck2 } from "lucide-react";
import DatePickerVN from "@/components/DatePickerVN";
import { toast } from "@/components/Toast";
import { formatCurrencyVND, dayKeyToNoonIso } from "@/utils/helper";

// Class tĩnh cho ô thống kê kết quả (Tailwind không sinh class từ chuỗi động)
const STAT_STYLES: Record<string, { box: string; num: string; label: string }> = {
  green: { box: "bg-green-50 border-green-200", num: "text-green-600", label: "text-green-700" },
  yellow: { box: "bg-yellow-50 border-yellow-200", num: "text-yellow-600", label: "text-yellow-700" },
  red: { box: "bg-red-50 border-red-200", num: "text-red-600", label: "text-red-700" },
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

interface BulkPaymentModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface ResultSummary {
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  skippedNames: string[];
  month: number;
  year: number;
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

function formatDateToDDMMYYYY(isoDate: string): string {
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

// "yyyy-mm-dd" → ISO ở mốc 12:00 UTC (chống lệch ngày do múi giờ trên máy khác).
function parseISOToTimestamp(isoDate: string): string | null {
  return dayKeyToNoonIso(isoDate);
}

// ─────────────────────────────────────────────────────────────────────────────

const BulkPaymentModal = ({ onClose, onSuccess }: BulkPaymentModalProps) => {
  const queryClient = useQueryClient();
  const today = new Date();

  const [collectionDate, setCollectionDate] = useState(todayYYYYMMDD());
  const [dateError, setDateError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [enteredById, setEnteredById] = useState<number | "">(""); // người nhập
  const [note, setNote] = useState(""); // ghi chú phiếu
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<ResultSummary | null>(null);

  const { data: companyList } = useQuery(trpc.companies.queryOptions());
  const { data: employeeList } = useQuery(trpc.employees.queryOptions());
  const bulkCreate = useMutation(trpc.bulkCreatePayments.mutationOptions());

  const filteredCompanies = useMemo(() => {
    if (!companyList) return [];
    const q = searchText.trim().toLowerCase();
    if (!q) return companyList;
    return companyList.filter(
      (c) => c.companyName.toLowerCase().includes(q) || c.taxId.toLowerCase().includes(q)
    );
  }, [companyList, searchText]);

  // Thứ tự đã chọn (1, 2, 3…) theo đúng trình tự bấm — Set giữ nguyên thứ tự thêm vào,
  // trùng với thứ tự phiếu sẽ được tạo (bulkCreatePayments lặp theo companyIds).
  const selectionOrder = useMemo(() => {
    const map = new Map<number, number>();
    Array.from(selectedIds).forEach((id, i) => map.set(id, i + 1));
    return map;
  }, [selectedIds]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const toggleCompany = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredCompanies.map((c) => c.id)));
  const clearAll = () => setSelectedIds(new Set());
  const isAllSelected = filteredCompanies.length > 0 && filteredCompanies.every((c) => selectedIds.has(c.id));

  const handleDateChange = (val: string) => {
    setCollectionDate(val);
    setDateError("");
  };

  const handleSubmit = async () => {
    if (!collectionDate) { setDateError("Vui lòng chọn ngày thu"); return; }
    const isoDate = parseISOToTimestamp(collectionDate);
    if (!isoDate) { setDateError("Ngày không hợp lệ"); return; }
    if (selectedIds.size === 0) return;

    try {
      const res = await bulkCreate.mutateAsync({
        companyIds: Array.from(selectedIds),
        month: selectedMonth,
        year: selectedYear,
        collectionDate: isoDate,
        note: note.trim() || null,
        enteredById: enteredById === "" ? null : enteredById,
      });

      const nameMap = new Map(companyList?.map((c) => [c.id, c.companyName]) ?? []);
      setResult({
        createdCount: res.created.length,
        skippedCount: res.skipped.length,
        failedCount: res.failed.length,
        skippedNames: res.skipped.map((id) => nameMap.get(id) ?? `ID ${id}`),
        month: selectedMonth,
        year: selectedYear,
        batchId: res.batchId,
      });

      await queryClient.invalidateQueries({ queryKey: [["payments"]] });
      await queryClient.invalidateQueries({ queryKey: [["companiesWithPayments"]] });

      if (res.created.length > 0) {
        toast.success(
          `Đã thu ${res.created.length} công ty cho T${selectedMonth}/${selectedYear}`,
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
              Tháng <span className="font-semibold text-gray-800">{result.month}/{result.year}</span>
              {result.batchId != null && (
                <>
                  {" · "}
                  <span className="font-semibold text-gray-800">Phiếu #{result.batchId}</span>
                </>
              )}
            </p>
          </div>
          <div className="w-full grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Đã tạo", count: result.createdCount, color: "green" },
              { label: "Bỏ qua", count: result.skippedCount, color: "yellow" },
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
          {result.skippedNames.length > 0 && (
            <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 sm:p-3">
              <p className="text-xs font-semibold text-yellow-800 mb-1.5">Công ty bỏ qua (đã có dữ liệu):</p>
              <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                {result.skippedNames.map((name) => (
                  <li key={name} className="text-xs text-yellow-700">• {name}</li>
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

  const canSubmit = selectedIds.size > 0 && collectionDate.length === 10 && !dateError;

  // ── Main form ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/*
        Modal: responsive sizing for different screen resolutions.
        Layout: header (shrink-0) | fields (shrink-0) | company-section (flex-1, min-h-0) | footer (shrink-0)
      */}
      <div
        // Modal cao theo nội dung nhưng tối đa 90vh. Danh sách công ty có min-h
        // (đảm bảo luôn ≥3 dòng) + flex-1 để giãn thêm khi còn chỗ; nếu tràn thì
        // cuộn trong danh sách. Không dùng chiều cao cố định để tránh footer đè lên
        // list trên màn hình nhỏ.
        className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-h-[90vh] max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── (shrink-0) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center shrink-0 shadow-md shadow-green-100">
              <Building2 size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-gray-900 leading-tight">Thu Nhiều Công Ty</h2>
            </div>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-all focus:outline-none shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* ── Form fields ── (shrink-0) — gom gọn để list công ty rộng hơn */}
        <div className="px-4 sm:px-6 py-2 border-b border-gray-100 shrink-0 space-y-2">
          {/* Hàng 1: Ngày thu · Tháng · Năm (gom phần chọn thời gian) */}
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

            {/* Tháng */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                Tháng <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-900 hover:border-gray-400 transition-all shadow-sm cursor-pointer"
                id="bulk-month"
                aria-label="Tháng"
              >
                {MONTHS.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            </div>

            {/* Năm */}
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                Năm <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-900 hover:border-gray-400 transition-all shadow-sm cursor-pointer"
                id="bulk-year"
                aria-label="Năm"
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

        {/* ── Company section ── (flex-1, takes remaining height; overflow-hidden
            để list không bao giờ đè lên footer trên màn hình nhỏ) */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden px-4 sm:px-6 py-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2 shrink-0 gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
              Chọn công ty <span className="text-red-500">*</span>
              {selectedIds.size > 0 && (
                <span className="px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-black shadow-sm">
                  đã chọn {selectedIds.size}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={isAllSelected ? clearAll : selectAll}
              className="text-sm text-green-600 hover:text-green-800 font-bold focus:outline-none border-b-2 border-transparent hover:border-green-600 transition-all"
            >
              {isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          </div>

          {/* Đã chọn theo thứ tự nhập — xem lại & bỏ chọn nhanh */}
          {selectedIds.size > 0 && (
            <div className="mb-1.5 shrink-0">
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Đã chọn theo thứ tự nhập:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto p-1.5 bg-green-50/60 border border-green-100 rounded-lg">
                {Array.from(selectedIds).map((id, i) => {
                  const c = companyList?.find((x) => x.id === id);
                  if (!c) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 bg-white border border-green-200 rounded-full text-xs font-semibold text-gray-700 shadow-sm"
                    >
                      <span className="w-5 h-5 shrink-0 rounded-full bg-green-600 text-white text-[10px] font-black flex items-center justify-center leading-none">
                        {i + 1}
                      </span>
                      <span className="truncate max-w-[160px]">{c.companyName}</span>
                      <button
                        type="button"
                        onClick={() => toggleCompany(id)}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        title="Bỏ chọn"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search — gõ tên rồi nhấn Enter để chọn nhanh công ty đầu tiên */}
          <div className="relative mb-2 shrink-0 max-w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = filteredCompanies.find((c) => !selectedIds.has(c.id));
                  if (next) {
                    toggleCompany(next.id);
                    setSearchText("");
                  }
                }
              }}
              placeholder="Tìm công ty, mã số thuế... (Enter để chọn nhanh)"
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-400 transition-all shadow-sm"
              id="bulk-search"
            />
          </div>

          {/* min-h-[156px] đảm bảo LUÔN thấy ít nhất ~3 công ty, kể cả trên màn nhỏ
              (1600x900 @125% ≈ 1280x720 CSS) và khi đã chọn nhiều. Chip "đã chọn"
              bị giới hạn chiều cao + cuộn riêng nên không lấn danh sách. */}
          <div className="flex-1 min-h-[156px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 shadow-inner bg-gray-50/30">
            {!companyList || companyList.length === 0 ? (
              <div className="p-4 text-center text-gray-400 font-medium text-sm">Đang tải...</div>
            ) : searchText.trim() && filteredCompanies.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-400 font-medium text-sm">Không tìm thấy công ty</p>
              </div>
            ) : (
              filteredCompanies.map((company) => {
                const checked = selectedIds.has(company.id);
                return (
                  <label
                    key={company.id}
                    // Chiều cao HÀNG cố định 52px → tính toán "≥3 dòng" chính xác,
                    // không bị giãn do line-height. Tên/MST cắt gọn 1 dòng (truncate).
                    className={`flex items-center gap-2.5 px-3 h-[52px] cursor-pointer transition-colors ${
                      checked ? "bg-green-50/80 hover:bg-green-50" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input type="checkbox" checked={checked}
                      onChange={() => toggleCompany(company.id)} className="sr-only" />
                    {checked ? (
                      <span
                        className="w-6 h-6 shrink-0 rounded-md bg-green-600 text-white text-xs font-black flex items-center justify-center leading-none shadow-sm"
                        title={`Thứ tự nhập: ${selectionOrder.get(company.id)}`}
                      >
                        {selectionOrder.get(company.id)}
                      </span>
                    ) : (
                      <Square size={20} className="text-gray-300 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{company.companyName}</p>
                      <p className="text-[11px] text-gray-500 font-medium truncate leading-tight">{company.taxId}</p>
                    </div>
                    {company.serviceFee != null && (
                      <span className="text-sm font-bold text-gray-700 shrink-0 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm whitespace-nowrap">
                        {formatCurrencyVND(company.serviceFee)}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* ── Footer ── (shrink-0) */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between flex-wrap sm:flex-nowrap shrink-0 gap-3 bg-gray-50/80 rounded-b-xl">
          <p className="text-sm text-gray-600 font-bold w-full sm:w-auto truncate">
            {selectedIds.size === 0
              ? "Chưa chọn công ty nào"
              : `Đã chọn ${selectedIds.size} công ty · Kỳ T${String(selectedMonth).padStart(2, "0")}/${selectedYear}`}
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
                  <span>Thu tiền{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}</span>
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
