import { useMemo, useState, useEffect, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../utils/trpc";
import { Search, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, X, Trash2, Plus } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import { formatCurrencyVND, dayKeyToNoonIso } from "@/utils/helper";
import DatePickerVN from "@/components/DatePickerVN";
import { toast } from "@/components/Toast";
import BulkPaymentModal from "@/components/BulkPaymentModal";

// Thông tin phiếu (từ PaymentBatch) cần để gom theo NGƯỜI NHẬP
interface BatchInfo {
  enteredById: number | null;
  enteredByName: string | null;
  note: string | null;
}

// Một phiếu (payment) kèm thông tin công ty, dùng cho chế độ lọc theo ngày
interface DayPayment {
  paymentId: number;
  companyId: number;
  companyName: string;
  taxId: string;
  month: number;
  year: number;
  amount: number | null;
  note: string | null;
  collectionDate: Date | null;
  batchId: number | null;
  batch: BatchInfo | null;
}

// Một nhóm hiển thị = 1 phiếu = toàn bộ dòng thu của cùng 1 NGƯỜI NHẬP trong ngày
interface PhieuGroup {
  key: string; // "person-<id>" | "person-none" | "ungrouped"
  label: string; // tên người nhập | "Chưa rõ người nhập" | "Chưa gán phiếu (dữ liệu cũ)"
  isOld: boolean; // true = dòng không thuộc phiếu nào (dữ liệu cũ)
  rows: DayPayment[];
  total: number; // tổng tiền
  periods: string[]; // các kỳ T/Q khác nhau, vd ["T01/2026","T02/2026"]
  notes: string[]; // các ghi chú khác nhau (nếu có)
  sortKey: number; // min(paymentId) để giữ thứ tự tạo; nhóm cũ/none xếp cuối
  // Phiếu đại diện (batch có paymentId nhỏ nhất) để "Thêm công ty vào phiếu".
  batchId: number | null; // null với nhóm cũ/không rõ → không cho thêm
  batchMonth: number; // kỳ của phiếu đại diện
  batchYear: number;
  enteredById: number | null; // người nhập của phiếu đại diện
  companyIds: number[]; // các công ty đã có trong nhóm (để loại khỏi danh sách thêm)
}

// Phiếu đích khi bấm "Thêm công ty vào phiếu" (khớp prop targetBatch của BulkPaymentModal)
interface AddTarget {
  batchId: number;
  defaultMonth: number; // kỳ đại diện của phiếu → gợi ý "kỳ đang chọn"
  defaultYear: number;
  collectionDate: string | null;
  enteredById: number | null;
  existingItems: { companyId: number; month: number; year: number }[]; // dòng đã có trong phiếu
}

// Chuẩn hoá 1 Date về khoá ngày yyyy-mm-dd (theo giờ địa phương)
const dateKeyOf = (d: Date | null): string | null => {
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate(),
  ).padStart(2, "0")}`;
};

const formatDateKey = (key: string): string => {
  const [y, m, dd] = key.split("-");
  return `${dd}/${m}/${y}`;
};


// Chuyển khoá "yyyy-mm-dd" thành ISO ở mốc 12:00 UTC (tránh lệch ngày do múi giờ)
const dateKeyToIso = (key: string): string => dayKeyToNoonIso(key)!;

// ─── DayPaymentRow: 1 phiếu trong chế độ lọc theo ngày, cho sửa inline ──────────
interface DayPaymentRowProps {
  row: DayPayment;
  index: number;
  fallbackYear: number;
  onSave: (paymentId: number, data: Record<string, unknown>) => Promise<void>;
  onDelete?: (paymentId: number) => void; // hiện nút xóa bên phải nếu có
  selected?: boolean; // ô tick đang được chọn
  onToggleSelect?: (paymentId: number) => void; // hiện ô tick bên trái nếu có
  isLatest?: boolean; // hiện nhãn "Mới nhất" (dùng ở danh sách tổng)
}

// Khung lưới cột dùng chung cho tiêu đề + từng hàng (giống bảng kê Book1.xlsx)
// Cột đầu (28/32px) là ô tick chọn nhiều để xóa hàng loạt.
const DAY_GRID_COLS =
  "grid grid-cols-[28px_36px_1fr_104px_52px_64px] sm:grid-cols-[32px_48px_1fr_150px_72px_76px] items-center gap-2";

const DayPaymentRow = ({ row, index, fallbackYear, onSave, onDelete, selected, onToggleSelect, isLatest }: DayPaymentRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState(row.amount != null ? String(row.amount) : "");
  const [note, setNote] = useState(row.note ?? "");

  useEffect(() => {
    setAmount(row.amount != null ? String(row.amount) : "");
    setNote(row.note ?? "");
  }, [row.amount, row.note]);

  const handleAmountBlur = () => {
    const parsed = amount.trim() === "" ? null : Number(amount);
    if (parsed !== null && Number.isNaN(parsed)) return;
    if (parsed === (row.amount ?? null)) return;
    onSave(row.paymentId, { amount: parsed });
  };

  const handleNoteBlur = () => {
    const trimmed = note.trim();
    if (trimmed === (row.note ?? "")) return;
    onSave(row.paymentId, { note: trimmed || null });
  };

  const handleDateChange = (key: string) => {
    const iso = key ? dateKeyToIso(key) : null;
    const oldIso = row.collectionDate
      ? dateKeyToIso(dateKeyOf(row.collectionDate)!)
      : null;
    if (iso === oldIso) return;
    onSave(row.paymentId, { collectionDate: iso });
  };

  const inputBase =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-gray-800 transition-all";

  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden transition-all ${
        expanded ? "border-blue-300 shadow-sm" : "border-gray-200 hover:border-blue-200"
      }`}
    >
      {/* Hàng tóm tắt (STT · Tên DN · Tiền Lương · T/Q) — bấm để mở panel chỉnh sửa.
          Dùng role="button" (không phải <button>) để có thể lồng nút Xóa bên trong. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        aria-expanded={expanded}
        className={`w-full ${DAY_GRID_COLS} px-2.5 sm:px-4 py-2.5 text-left cursor-pointer transition-all ${
          expanded ? "bg-blue-50/60" : "hover:bg-blue-50/40"
        }`}
      >
        {onToggleSelect ? (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(row.paymentId)}
            onClick={(e) => e.stopPropagation()} // không mở panel sửa khi tick
            title="Chọn phiếu này"
            aria-label="Chọn phiếu này"
            className="w-4 h-4 accent-blue-600 cursor-pointer mx-auto"
          />
        ) : (
          <span />
        )}
        <span className="text-sm font-bold text-gray-500 text-center">{index + 1}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-gray-900 truncate">{row.companyName}</span>
            {isLatest && (
              <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap shrink-0">
                Mới nhất
              </span>
            )}
          </span>
          <span className="block text-xs text-gray-400 truncate">{row.taxId}</span>
        </span>
        <span className="text-right text-sm font-bold text-green-600 tabular-nums truncate">
          {row.amount != null ? formatCurrencyVND(row.amount) : "—"}
        </span>
        <span className="text-center">
          <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md whitespace-nowrap">
            T{String(row.month).padStart(2, "0")}
          </span>
        </span>
        <span className="flex justify-center items-center gap-0.5 text-gray-400">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // không mở/đóng panel sửa khi bấm Xóa
                onDelete(row.paymentId);
              }}
              title="Xóa phiếu thu"
              aria-label="Xóa phiếu thu"
              className="w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </div>

      {/* Panel chỉnh sửa — chỉ hiện khi bấm vào công ty */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/70 px-3 sm:px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Số tiền thu
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={handleAmountBlur}
                placeholder="Nhập số tiền..."
                className={inputBase}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Ngày thu
              </label>
              <DatePickerVN
                value={dateKeyOf(row.collectionDate) ?? ""}
                onChange={handleDateChange}
                fallbackYear={fallbackYear}
                className="w-full"
                inputClassName="w-full pr-3 py-2.5 focus:outline-none text-gray-800 text-sm font-medium bg-transparent placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Ghi chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Nhập ghi chú..."
                className={inputBase}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ThongKePhieuThu = () => {
  const queryClient = useQueryClient();
  const { data: companyList, isLoading, error, refetch } = useQuery(
    trpc.companiesWithPayments.queryOptions()
  );

  const updatePayment = useMutation(trpc.updatePayment.mutationOptions());
  const deletePayment = useMutation(trpc.deletePayment.mutationOptions());
  const deletePayments = useMutation(trpc.deletePayments.mutationOptions());
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [["companiesWithPayments"]] });

  // Tick chọn nhiều phiếu để xóa 1 lượt (key = paymentId)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const currentYear = new Date().getFullYear();

  const [searchText, setSearchText] = useState<string>("");
  const [sortType, setSortType] = useState<
    "latest" | "name" | "month-year" | "date"
  >("latest");
  const [filterDate, setFilterDate] = useState<string>(""); // khoá yyyy-mm-dd, rỗng = không lọc
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30000); // 30 seconds
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null); // phiếu đang "thêm công ty"

  const fieldLabel = (data: Record<string, unknown>): string => {
    if ("amount" in data) return "số tiền thu";
    if ("collectionDate" in data) return "ngày thu";
    if ("note" in data) return "ghi chú";
    return "phiếu";
  };

  const handleSavePaymentField = async (
    paymentId: number,
    data: Record<string, unknown>,
  ) => {
    const label = fieldLabel(data);
    try {
      await updatePayment.mutateAsync({ id: paymentId, data });
      await invalidate();
      toast.success(`Đã cập nhật ${label}`);
    } catch (err) {
      console.error("updatePayment error:", err);
      toast.error(`Cập nhật ${label} thất bại. Vui lòng thử lại.`);
      await invalidate();
    }
  };

  // Xóa 1 phiếu thu (có hỏi xác nhận). Dùng chung cho cả 2 chế độ hiển thị.
  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phiếu thu này?")) return;
    try {
      await deletePayment.mutateAsync({ id: paymentId });
      await invalidate();
      toast.success("Đã xóa phiếu thu");
    } catch (err) {
      console.error("deletePayment error:", err);
      toast.error("Xóa thất bại. Vui lòng thử lại.");
      await invalidate();
    }
  };

  // Xóa hàng loạt các phiếu đang được tick (có hỏi xác nhận).
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${ids.length} phiếu thu đã chọn?`))
      return;
    try {
      await deletePayments.mutateAsync({ ids });
      setSelectedIds(new Set());
      await invalidate();
      toast.success(`Đã xóa ${ids.length} phiếu thu`);
    } catch (err) {
      console.error("deletePayments error:", err);
      toast.error("Xóa thất bại. Vui lòng thử lại.");
      await invalidate();
    }
  };

  const ITEMS_PER_PAGE = 10;

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, refetch]);

  // Danh sách phiếu thu (mỗi payment = 1 dòng = công ty × kỳ). Không gộp per-company →
  // công ty có nhiều kỳ (T/Q) trong 1 phiếu sẽ hiện ĐỦ các dòng.
  const paymentRows = useMemo(() => {
    if (!companyList) return [] as DayPayment[];
    const q = searchText.trim().toLowerCase();
    const rows: DayPayment[] = [];
    for (const company of companyList) {
      if (
        q &&
        !company.companyName.toLowerCase().includes(q) &&
        !company.taxId.toLowerCase().includes(q)
      ) {
        continue;
      }
      for (const p of company.payments) {
        const b = p.batch;
        rows.push({
          paymentId: p.id,
          companyId: company.id,
          companyName: company.companyName,
          taxId: company.taxId,
          month: p.month,
          year: p.year,
          amount: p.amount ?? null,
          note: p.note,
          collectionDate: p.collectionDate,
          batchId: p.batchId ?? null,
          batch: b
            ? {
                enteredById: b.enteredById ?? null,
                enteredByName: b.enteredBy?.fullName ?? null,
                note: b.note,
              }
            : null,
        });
      }
    }

    const ts = (d: Date | null) => (d ? new Date(d).getTime() : 0);
    rows.sort((a, b) => {
      if (sortType === "latest") {
        // Mới nhất = dòng THÊM SAU CÙNG (id lớn nhất) lên đầu, rồi giảm dần.
        return b.paymentId - a.paymentId;
      } else if (sortType === "month-year") {
        if (b.year !== a.year) return b.year - a.year;
        if (b.month !== a.month) return b.month - a.month;
        return a.companyName.localeCompare(b.companyName);
      } else if (sortType === "date") {
        // Ngày thu mới nhất trước; chưa có ngày xếp cuối; phụ: thứ tự nhập (id desc)
        const tb = ts(b.collectionDate);
        const ta = ts(a.collectionDate);
        if (tb !== ta) return tb - ta;
        return b.paymentId - a.paymentId;
      } else {
        // Tên A-Z; phụ: thứ tự nhập (id desc)
        return a.companyName.localeCompare(b.companyName) || b.paymentId - a.paymentId;
      }
    });

    return rows;
  }, [companyList, searchText, sortType]);

  // Đếm số phiếu theo ngày thu (trên toàn danh sách đã lọc), sort ngày giảm dần
  const dateCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of paymentRows) {
      const key = dateKeyOf(r.collectionDate);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [paymentRows]);

  const dateCountMap = useMemo(() => new Map(dateCounts), [dateCounts]);

  // Chế độ lọc theo ngày: gom tất cả phiếu có collectionDate khớp filterDate
  const paymentsOnDate = useMemo(() => {
    if (!companyList || !filterDate) return [] as DayPayment[];
    const q = searchText.trim().toLowerCase();
    const rows: DayPayment[] = [];
    for (const company of companyList) {
      if (
        q &&
        !company.companyName.toLowerCase().includes(q) &&
        !company.taxId.toLowerCase().includes(q)
      ) {
        continue;
      }
      for (const p of company.payments) {
        if (dateKeyOf(p.collectionDate) !== filterDate) continue;
        const b = p.batch;
        rows.push({
          paymentId: p.id,
          companyId: company.id,
          companyName: company.companyName,
          taxId: company.taxId,
          month: p.month,
          year: p.year,
          amount: p.amount ?? null,
          note: p.note,
          collectionDate: p.collectionDate,
          batchId: p.batchId ?? null,
          batch: b
            ? {
                enteredById: b.enteredById ?? null,
                enteredByName: b.enteredBy?.fullName ?? null,
                note: b.note,
              }
            : null,
        });
      }
    }
    // Sắp xếp theo THỨ TỰ NHẬP VÀO: id phiếu tăng dần = thứ tự tạo phiếu
    // (khớp đúng trình tự người dùng chọn công ty ở "Thu nhiều công ty").
    return rows.sort((a, b) => a.paymentId - b.paymentId);
  }, [companyList, filterDate, searchText]);

  const dayTotalAmount = useMemo(
    () => paymentsOnDate.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    [paymentsOnDate],
  );

  // Gom các dòng trong ngày thành từng PHIẾU theo NGƯỜI NHẬP: cùng 1 người nhập
  // (dù nhập nhiều lần, nhiều tháng) → 1 phiếu. Dòng chưa rõ người nhập / dữ liệu
  // cũ gom vào nhóm riêng, xếp cuối.
  const phieuGroups = useMemo<PhieuGroup[]>(() => {
    const map = new Map<string, PhieuGroup>();
    for (const row of paymentsOnDate) {
      let key: string;
      let label: string;
      let isOld = false;
      if (row.batch == null) {
        key = "ungrouped";
        label = "Chưa gán phiếu (dữ liệu cũ)";
        isOld = true;
      } else if (row.batch.enteredById == null) {
        key = "person-none";
        label = "Chưa rõ người nhập";
      } else {
        key = `person-${row.batch.enteredById}`;
        label = row.batch.enteredByName ?? `NV #${row.batch.enteredById}`;
      }

      let g = map.get(key);
      if (!g) {
        // Nhóm "người nhập" sắp theo thứ tự tạo (paymentId nhỏ nhất); nhóm none/cũ cuối
        const base =
          key === "ungrouped" || key === "person-none"
            ? Number.MAX_SAFE_INTEGER
            : row.paymentId;
        // paymentsOnDate đã sắp theo paymentId tăng dần → row đầu tiên của nhóm là
        // phiếu đại diện (batch có paymentId nhỏ nhất) để "Thêm công ty vào phiếu".
        g = {
          key,
          label,
          isOld,
          rows: [],
          total: 0,
          periods: [],
          notes: [],
          sortKey: base,
          batchId: row.batchId,
          batchMonth: row.month,
          batchYear: row.year,
          enteredById: row.batch?.enteredById ?? null,
          companyIds: [],
        };
        map.set(key, g);
      }
      g.rows.push(row);
      g.total += row.amount ?? 0;
      if (!g.companyIds.includes(row.companyId)) g.companyIds.push(row.companyId);
      if (key.startsWith("person-") && row.paymentId < g.sortKey) g.sortKey = row.paymentId;

      const period = `T${String(row.month).padStart(2, "0")}/${row.year}`;
      if (!g.periods.includes(period)) g.periods.push(period);
      const noteTxt = row.batch?.note?.trim();
      if (noteTxt && !g.notes.includes(noteTxt)) g.notes.push(noteTxt);
    }
    // Kỳ T/Q sắp tăng dần cho gọn
    for (const g of map.values()) g.periods.sort();
    return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [paymentsOnDate]);

  // Chọn/bỏ chọn hàng loạt theo danh sách id (dùng cho "chọn tất cả" trong 1 phiếu).
  const toggleSelectMany = (ids: number[], select: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });

  // Pagination
  const totalPages = Math.ceil(paymentRows.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRows = paymentRows.slice(startIndex, endIndex);

  // Id các phiếu ĐANG HIỂN THỊ ở khung nhìn hiện tại (để "chọn tất cả" + tránh
  // lỡ xóa dòng ở trang/bộ lọc khác đang ẩn).
  const visibleIds = useMemo(() => {
    if (filterDate) return paymentsOnDate.map((r) => r.paymentId);
    return paginatedRows.map((r) => r.paymentId);
  }, [filterDate, paymentsOnDate, paginatedRows]);

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  // Reset to page 1 when search or sort changes; đồng thời bỏ chọn để tránh xóa nhầm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, sortType]);

  // Bỏ chọn khi đổi ngữ cảnh hiển thị (trang, lọc ngày, tìm kiếm, sắp xếp)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, filterDate, searchText, sortType]);

  if (isLoading) {
    return (
      <LoadingState
        title="Thống Kê Phiếu Thu"
        subtitle="Danh sách phiếu thu — mỗi kỳ (T/Q) một dòng, mới nhất lên đầu"
        message="Đang tải dữ liệu..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Thống Kê Phiếu Thu</h1>
          <p className="text-gray-600 mt-2">Danh sách phiếu thu — mỗi kỳ (T/Q) một dòng, mới nhất lên đầu</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500 text-lg">
            Lỗi khi tải dữ liệu: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 h-screen flex flex-col bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 flex-shrink-0">
        {/* Canh giữa, giới hạn bề ngang cho dễ đọc trên màn lớn (24"/1920px) */}
        <div className="max-w-6xl mx-auto w-full space-y-4">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thống Kê Phiếu Thu</h1>
          <p className="text-gray-600 mt-1">Danh sách phiếu thu — mỗi kỳ (T/Q) một dòng, mới nhất lên đầu</p>
        </div>

        {/* Search - Full Width */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Tìm công ty, mã số thuế..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 bg-white text-gray-900 placeholder-gray-400 transition-all shadow-sm"
            tabIndex={0}
            aria-label="Tìm kiếm công ty"
          />
        </div>

        {/* Sort & Refresh - Bottom Row */}
        <div className="flex items-end gap-4 flex-wrap">
          {/* Sắp xếp */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
              Sắp xếp
            </label>
            <div className="relative">
              <select
                value={sortType}
                disabled={!!filterDate}
                onChange={(e) =>
                  setSortType(
                    e.target.value as "latest" | "name" | "month-year" | "date",
                  )
                }
                className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-white text-gray-900 font-semibold hover:border-gray-400 transition-all shadow-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="latest">Mới nhất</option>
                <option value="date">Ngày nhập</option>
                <option value="month-year">Tháng/Năm</option>
                <option value="name">Tên A-Z</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Lọc theo ngày thu: lịch tiếng Việt + gõ tự chèn dấu / */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
              Lọc theo ngày thu
            </label>
            <div className="flex items-center gap-2">
              <DatePickerVN
                value={filterDate}
                onChange={setFilterDate}
                fallbackYear={currentYear}
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate("")}
                  className="px-3 py-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-xl transition-all flex items-center gap-1 whitespace-nowrap"
                  title="Xóa lọc theo ngày"
                >
                  <X size={16} />
                  <span className="hidden sm:inline text-sm font-semibold">Xóa lọc</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => refetch()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
            title="Cập nhật dữ liệu"
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Cập nhật</span>
          </button>
        </div>
        </div>
      </div>

      {/* List Section */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col">
        {/* Canh giữa, giới hạn bề ngang cho dễ đọc trên màn lớn (24"/1920px) */}
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        {/* Thanh hành động hàng loạt — chỉ hiện khi đã tick chọn phiếu */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-3 flex-wrap bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 shadow-sm">
            <span className="text-sm font-bold text-red-700">
              Đã chọn {selectedIds.size} phiếu
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-all"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Trash2 size={16} />
              Xóa đã chọn
            </button>
          </div>
        )}
        {filterDate ? (
          /* ── Chế độ lọc theo ngày thu ────────────────────────────────── */
          <>
            <div className="mb-4 flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
              <span className="text-lg font-bold text-gray-900">
                📅 {formatDateKey(filterDate)}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
                {paymentsOnDate.length} công ty
              </span>
              <div className="flex-1" />
              <span className="text-sm text-gray-500 font-semibold uppercase tracking-wider">
                Tổng thu
              </span>
              <span className="text-xl font-black text-green-600">
                {formatCurrencyVND(dayTotalAmount || null)}
              </span>
            </div>

            {paymentsOnDate.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500 text-lg">
                  Không có công ty nào nhập trong ngày {formatDateKey(filterDate)}
                </p>
              </div>
            ) : (
              /* Gom theo NGƯỜI NHẬP: mỗi người nhập = 1 card phiếu (gồm mọi tháng
                 người đó đã nhập trong ngày). Header: tên người nhập · các kỳ T/Q ·
                 ghi chú · số cty · tổng tiền. */
              <div className="flex-1 space-y-4">
                {phieuGroups.map((group) => {
                  const ids = group.rows.map((r) => r.paymentId);
                  const allSel =
                    ids.length > 0 && ids.every((id) => selectedIds.has(id));
                  return (
                    <div
                      key={group.key}
                      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                    >
                      {/* Header phiếu (theo người nhập) */}
                      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
                        <span
                          className={`text-sm font-black whitespace-nowrap ${
                            group.isOld ? "text-gray-700" : "text-gray-900"
                          }`}
                        >
                          {group.isOld ? group.label : `👤 ${group.label}`}
                        </span>
                        {!group.isOld &&
                          group.periods.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md whitespace-nowrap"
                            >
                              {p}
                            </span>
                          ))}
                        {group.notes.length > 0 && (
                          <span className="text-xs text-gray-500 italic truncate max-w-[260px]">
                            "{group.notes.join(" · ")}"
                          </span>
                        )}
                        <div className="flex-1" />
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {group.rows.length} cty
                        </span>
                        <span className="text-sm font-black text-green-600 whitespace-nowrap">
                          {formatCurrencyVND(group.total || null)}
                        </span>
                        {/* Thêm công ty thiếu vào ĐÚNG phiếu này (chỉ phiếu thật) */}
                        {group.batchId != null && (
                          <button
                            type="button"
                            onClick={() =>
                              setAddTarget({
                                batchId: group.batchId!,
                                defaultMonth: group.batchMonth,
                                defaultYear: group.batchYear,
                                collectionDate: filterDate || null,
                                enteredById: group.enteredById,
                                existingItems: group.rows.map((r) => ({
                                  companyId: r.companyId,
                                  month: r.month,
                                  year: r.year,
                                })),
                              })
                            }
                            className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all whitespace-nowrap shadow-sm"
                            title="Thêm công ty còn thiếu vào phiếu này"
                          >
                            <Plus size={14} />
                            Thêm công ty
                          </button>
                        )}
                      </div>

                      {/* Tiêu đề cột + danh sách dòng trong phiếu */}
                      <div className="px-2 py-2">
                        <div
                          className={`${DAY_GRID_COLS} px-2.5 sm:px-4 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider`}
                        >
                          <input
                            type="checkbox"
                            checked={allSel}
                            onChange={() => toggleSelectMany(ids, !allSel)}
                            title="Chọn tất cả trong phiếu"
                            aria-label="Chọn tất cả dòng trong phiếu"
                            className="w-4 h-4 accent-blue-600 cursor-pointer mx-auto"
                          />
                          <span className="text-center">STT</span>
                          <span>Tên DN</span>
                          <span className="text-right">Số Tiền</span>
                          <span className="text-center">T/Q</span>
                          <span />
                        </div>
                        <div className="space-y-1.5">
                          {group.rows.map((row, index) => (
                            <DayPaymentRow
                              key={row.paymentId}
                              row={row}
                              index={index}
                              fallbackYear={currentYear}
                              onSave={handleSavePaymentField}
                              onDelete={handleDeletePayment}
                              selected={selectedIds.has(row.paymentId)}
                              onToggleSelect={toggleSelect}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : paymentRows.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500 text-lg">Chưa có phiếu thu nào</p>
          </div>
        ) : (
          <>
            <div className="flex-1">
            {/* Tiêu đề cột — giống bảng kê Book1.xlsx (STT · Tên DN · Số Tiền · T/Q) */}
            <div
              className={`${DAY_GRID_COLS} px-2.5 sm:px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider`}
            >
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                title="Chọn tất cả"
                aria-label="Chọn tất cả phiếu đang hiển thị"
                className="w-4 h-4 accent-blue-600 cursor-pointer mx-auto"
              />
              <span className="text-center">STT</span>
              <span>Tên DN</span>
              <span className="text-right">Số Tiền</span>
              <span className="text-center">T/Q</span>
              <span />
            </div>
            <div className="space-y-1.5">
            {paginatedRows.map((row, index) => {
              const isLatest = startIndex + index === 0;

              // Dòng phân cách theo ngày thu (chỉ khi đang sort theo ngày)
              const curKey = dateKeyOf(row.collectionDate);
              const prevKey =
                index > 0 ? dateKeyOf(paginatedRows[index - 1].collectionDate) : null;
              const showDateDivider =
                sortType === "date" && (index === 0 || curKey !== prevKey);

              return (
                <Fragment key={row.paymentId}>
                {showDateDivider && (
                  <div className="flex items-center gap-2 pt-2 pb-1 first:pt-0">
                    <span className="text-sm font-bold text-gray-700">
                      {curKey ? `📅 ${formatDateKey(curKey)}` : "📅 Chưa có ngày thu"}
                    </span>
                    {curKey && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        {dateCountMap.get(curKey) ?? 0} phiếu
                      </span>
                    )}
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                {/* Mỗi payment = 1 dòng (công ty × kỳ); bấm để mở panel sửa inline */}
                <DayPaymentRow
                  row={row}
                  index={startIndex + index}
                  fallbackYear={currentYear}
                  onSave={handleSavePaymentField}
                  onDelete={handleDeletePayment}
                  selected={selectedIds.has(row.paymentId)}
                  onToggleSelect={toggleSelect}
                  isLatest={isLatest}
                />
                </Fragment>
              );
            })}
            </div>
            </div>

            {/* Pagination Controls - At Bottom of List */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                  Hiển thị <span className="font-bold">{startIndex + 1}-{Math.min(endIndex, paymentRows.length)}</span> / <span className="font-bold">{paymentRows.length}</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Modal thêm công ty thiếu vào phiếu đã có (tái dùng BulkPaymentModal) */}
      {addTarget && (
        <BulkPaymentModal
          targetBatch={addTarget}
          onClose={() => setAddTarget(null)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default ThongKePhieuThu;
