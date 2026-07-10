import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { trpc } from "../utils/trpc";
import { formatCurrencyVND, dayKeyToNoonIso, formatDateVN } from "@/utils/helper";
import MoneyInput from "@/components/MoneyInput";
import { toast } from "@/components/Toast";
import { confirmDialog } from "@/components/ConfirmDialog";

const ROLE_LABELS: Record<string, string> = {
  DICH_VU_KH: "NV Dịch Vụ KH",
  LAP_SO: "NV Lập Sổ",
  NHAP_SO_LIEU: "NV Nhập Số Liệu",
};

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

// ─── Helper Functions ────────────────────────────────────────────────────────

// Convert dd/mm/yyyy to ISO date string (YYYY-MM-DD)
function parseDateVN(dateStr: string): { iso: string | null; month: number | null } {
  if (!dateStr.trim()) return { iso: null, month: null };
  const parts = dateStr.split("/");
  if (parts.length !== 3) return { iso: null, month: null };
  
  const [day, month, year] = parts;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  
  if (isNaN(d) || isNaN(m) || isNaN(y) || m < 1 || m > 12) {
    return { iso: null, month: null };
  }
  
  const iso = `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
  return { iso, month: m };
}

// ─── MonthRow ─────────────────────────────────────────────────────────────────

interface MonthRowProps {
  monthName: string;
  month: number;
  year: number;
  isPaid: boolean;
  note: string;
  amount: number | null;
  collectionDate: Date | null;
  isLoading: boolean;
  onToggle: () => void;
  onNoteBlur: (note: string) => void;
  onAmountBlur: (amount: string) => void;
  onDateBlur: (day: string) => void;
}

const MonthRow = ({
  monthName,
  month,
  year,
  isPaid,
  note,
  amount,
  collectionDate,
  isLoading,
  onToggle,
  onNoteBlur,
  onAmountBlur,
  onDateBlur,
}: MonthRowProps) => {
  const [localNote, setLocalNote] = useState(note);
  const [localAmount, setLocalAmount] = useState(amount ? amount.toString() : "");
  const [localDateInput, setLocalDateInput] = useState(
    collectionDate
      ? (() => {
          const date = new Date(collectionDate);
          const d = date.getDate().toString().padStart(2, "0");
          const m = (date.getMonth() + 1).toString().padStart(2, "0");
          return `${d}/${m}`;
        })()
      : ""
  );

  // Sync fields when external data changes (year switch, refetch, etc.)
  useEffect(() => {
    setLocalNote(note);
    setLocalAmount(amount ? amount.toString() : "");
    setLocalDateInput(
      collectionDate
        ? (() => {
            const date = new Date(collectionDate);
            const d = date.getDate().toString().padStart(2, "0");
            const m = (date.getMonth() + 1).toString().padStart(2, "0");
            return `${d}/${m}`;
          })()
        : ""
    );
  }, [note, amount, collectionDate]);

  // Hiển thị ngày dd/mm/yyyy (chuẩn Việt)
  const displayDate = formatDateVN(collectionDate);

  return (
    <tr className={isPaid ? "bg-green-50" : "bg-white align-top"}>
      <td className="px-4 py-1.5 text-sm text-gray-800 whitespace-nowrap">
        {monthName}
      </td>
      <td className="px-4 py-1.5 text-center">
        <input
          type="checkbox"
          checked={isPaid}
          onChange={onToggle}
          disabled={isLoading}
          className="w-4 h-4 rounded border-gray-300 bg-white text-green-500 accent-green-500 focus:ring-green-500 [color-scheme:light] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        />
      </td>
      <td className="px-4 py-1.5">
        <MoneyInput
          value={isPaid ? localAmount : ""}
          onChange={(raw) => setLocalAmount(raw)}
          onBlur={() => onAmountBlur(localAmount)}
          placeholder={isPaid ? "Số tiền..." : "—"}
          disabled={!isPaid}
          className={`w-full border-solid box-border text-sm border rounded px-2 py-1 focus:outline-none ${
            isPaid
              ? "border-gray-200 focus:ring-1 focus:ring-green-400 bg-white text-gray-700 placeholder-gray-400"
              : "border-transparent bg-transparent text-gray-400 placeholder-gray-400 cursor-default"
          }`}
        />
      </td>
      <td className="px-4 py-1.5">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={isPaid ? localDateInput : ""}
            onChange={(e) => setLocalDateInput(e.target.value)}
            onBlur={() => onDateBlur(localDateInput)}
            placeholder={isPaid ? "dd/mm" : "—"}
            disabled={!isPaid}
            className={`w-16 border-solid box-border text-sm border rounded px-2 py-1 focus:outline-none text-center ${
              isPaid
                ? "border-gray-200 focus:ring-1 focus:ring-green-400 bg-white text-gray-700 placeholder-gray-400"
                : "border-transparent bg-transparent text-gray-400 placeholder-gray-400 cursor-default"
            }`}
          />
          {displayDate && (
            <span className="text-xs text-gray-500 ml-1">
              ({displayDate})
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-1.5 min-w-64">
        <textarea
          value={isPaid ? localNote : ""}
          onChange={(e) => setLocalNote(e.target.value)}
          onBlur={() => onNoteBlur(localNote)}
          placeholder={isPaid ? "Ghi chú..." : "—"}
          disabled={!isPaid}
          rows={3}
          className={`w-full border-solid box-border text-sm border rounded px-2 py-1 focus:outline-none resize-none ${
            isPaid
              ? "border-gray-200 focus:ring-1 focus:ring-green-400 bg-white text-gray-700 placeholder-gray-400"
              : "border-transparent bg-transparent text-gray-400 placeholder-gray-400 cursor-default"
          }`}
        />
      </td>
    </tr>
  );
};

// ─── CompanyDetailModal ───────────────────────────────────────────────────────

interface CompanyDetailModalProps {
  companyId: number;
  onClose: () => void;
  onDelete?: () => void;
}

const CompanyDetailModal = ({
  companyId,
  onClose,
  onDelete,
}: CompanyDetailModalProps) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loadingMonths, setLoadingMonths] = useState<Set<number>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    data: company,
    isLoading,
    refetch,
  } = useQuery(trpc.companyById.queryOptions({ id: companyId }));

  const createPayment = useMutation(trpc.createPayment.mutationOptions());
  const deletePayment = useMutation(trpc.deletePayment.mutationOptions());
  const updatePayment = useMutation(trpc.updatePayment.mutationOptions());
  const deleteCompany = useMutation(trpc.deleteCompany.mutationOptions());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const paymentsForYear = (company?.payments ?? []).filter(
    (p) => p.year === selectedYear,
  );

  const getPayment = (month: number) =>
    paymentsForYear.find((p) => p.month === month) ?? null;

  useEffect(() => {
    if (!company) return;
    
    const paidMonths = (company.payments ?? [])
      .filter(p => p.year === selectedYear)
      .map(p => p.month)
      .filter((m, index, self) => self.indexOf(m) === index)
      .sort((a, b) => a - b);
    
    // Lấy tháng vừa thao tác từ localStorage nếu có, hoặc mặc định là tháng đầu tiên
    const existingFilter = JSON.parse(localStorage.getItem("paymentListFilter") || "{}");
    const primaryMonth = existingFilter.primaryMonth || (paidMonths.length > 0 ? paidMonths[0] : undefined);

    const filterData = {
      year: selectedYear,
      months: paidMonths,
      primaryMonth: primaryMonth,
    };
    
    localStorage.setItem("paymentListFilter", JSON.stringify(filterData));
  }, [selectedYear, company?.payments]);

  const setPrimaryMonth = (month: number) => {
    const saved = JSON.parse(localStorage.getItem("paymentListFilter") || "{}");
    localStorage.setItem("paymentListFilter", JSON.stringify({ ...saved, primaryMonth: month }));
  };

  const handleToggle = async (month: number) => {
    setPrimaryMonth(month);
    setLoadingMonths((prev) => new Set(prev).add(month));
    const wasPaid = !!getPayment(month);
    try {
      const payment = getPayment(month);
      if (payment) {
        await deletePayment.mutateAsync({ id: payment.id });
      } else {
        await createPayment.mutateAsync({
          companyId,
          month,
          year: selectedYear,
          note: null,
          amount: company?.serviceFee ?? null,
        });
      }
      await refetch();
      toast.success(
        wasPaid
          ? `Đã bỏ phiếu tháng ${month}/${selectedYear}`
          : `Đã thêm phiếu tháng ${month}/${selectedYear}`,
      );
    } catch (err) {
      console.error("toggle payment error:", err);
      toast.error(`Thao tác tháng ${month}/${selectedYear} thất bại. Vui lòng thử lại.`);
    } finally {
      setLoadingMonths((prev) => {
        const next = new Set(prev);
        next.delete(month);
        return next;
      });
    }
  };

  const handleNoteBlur = async (month: number, note: string) => {
    const payment = getPayment(month);
    if (!payment) return;
    const trimmed = note.trim();
    if (trimmed === (payment.note ?? "")) return;
    try {
      await updatePayment.mutateAsync({
        id: payment.id,
        data: { note: trimmed || null },
      });
      await refetch();
      toast.success(`Đã cập nhật ghi chú tháng ${month}`);
    } catch (err) {
      console.error("updatePayment note error:", err);
      toast.error(`Cập nhật ghi chú tháng ${month} thất bại. Vui lòng thử lại.`);
    }
  };

  const handleAmountBlur = async (month: number, amountStr: string) => {
    const payment = getPayment(month);
    if (!payment) return;
    const amount = amountStr.trim() ? parseFloat(amountStr) : null;
    if (amount === payment.amount) return;
    try {
      await updatePayment.mutateAsync({
        id: payment.id,
        data: { amount },
      });
      await refetch();
      toast.success(`Đã cập nhật số tiền tháng ${month}`);
    } catch (err) {
      console.error("updatePayment amount error:", err);
      toast.error(`Cập nhật số tiền tháng ${month} thất bại. Vui lòng thử lại.`);
    }
  };

  const handleDateBlur = async (month: number, dateInput: string) => {
    setPrimaryMonth(month);
    const payment = getPayment(month);
    if (!payment) return;
    
    if (!dateInput.trim()) {
      try {
        await updatePayment.mutateAsync({
          id: payment.id,
          data: { collectionDate: null },
        });
        await refetch();
        toast.success(`Đã xoá ngày thu tháng ${month}`);
      } catch (err) {
        console.error("updatePayment date error:", err);
        toast.error(`Cập nhật ngày thu tháng ${month} thất bại. Vui lòng thử lại.`);
      }
      return;
    }

    // Parse dd/mm format
    const parts = dateInput.split("/");
    if (parts.length !== 2) return;

    const day = parseInt(parts[0], 10);
    const inputMonth = parseInt(parts[1], 10);

    if (isNaN(day) || isNaN(inputMonth) || day < 1 || day > 31 || inputMonth < 1 || inputMonth > 12) {
      return;
    }

    const dateStr = `${selectedYear.toString().padStart(4, "0")}-${inputMonth.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    // Lưu ở mốc 12:00 UTC để không lệch ngày khi chạy trên máy khác múi giờ
    const date = dayKeyToNoonIso(dateStr)!;
    
    const existingDate = payment.collectionDate
      ? new Date(payment.collectionDate).toISOString().split("T")[0]
      : null;
    
    if (date.split("T")[0] === existingDate) return;

    try {
      await updatePayment.mutateAsync({
        id: payment.id,
        data: { collectionDate: date },
      });
      await refetch();
      toast.success(`Đã cập nhật ngày thu tháng ${month}`);
    } catch (err) {
      console.error("updatePayment date error:", err);
      toast.error(`Cập nhật ngày thu tháng ${month} thất bại. Vui lòng thử lại.`);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!(await confirmDialog("Bạn có chắc chắn muốn xoá công ty này?", { title: "Xóa công ty" }))) return;
    try {
      await deleteCompany.mutateAsync({ id: companyId });
      toast.success("Đã xoá công ty");
      onDelete?.();
      onClose();
    } catch (err) {
      console.error("deleteCompany error:", err);
      toast.error("Xoá công ty thất bại. Vui lòng thử lại.");
    }
  }, [companyId, deleteCompany, onDelete, onClose]);

  const employeesByRole = {
    DICH_VU_KH: (company?.employeeAssignments ?? []).filter(
      (a) => a.role === "DICH_VU_KH",
    ),
    LAP_SO: (company?.employeeAssignments ?? []).filter(
      (a) => a.role === "LAP_SO",
    ),
    NHAP_SO_LIEU: (company?.employeeAssignments ?? []).filter(
      (a) => a.role === "NHAP_SO_LIEU",
    ),
  };

  const paidCount = paymentsForYear.length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      ref={modalRef}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-[1200px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Thông Tin Công Ty</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none focus:outline-none"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : !company ? (
          <div className="text-center py-8 px-6 text-red-500">
            Không tìm thấy dữ liệu công ty.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* Left panel – Company info & employees */}
            <div className="w-[300px] shrink-0 p-6 space-y-5 border-r border-gray-200 overflow-y-auto">
              {/* Company Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Tên Công Ty</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {company.companyName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Mã Số Thuế</p>
                  <p className="text-sm text-gray-900">{company.taxId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Phí Dịch Vụ</p>
                  <p className="text-sm text-gray-900">
                    {formatCurrencyVND(company.serviceFee ?? null)}
                  </p>
                </div>
              </div>

              {/* Assigned Employees */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Nhân Viên Phụ Trách
                </p>
                <div className="space-y-3">
                  {(["DICH_VU_KH", "LAP_SO", "NHAP_SO_LIEU"] as const).map(
                    (role) => (
                      <div key={role}>
                        <p className="text-xs text-gray-500 mb-1">
                          {ROLE_LABELS[role]}
                        </p>
                        {employeesByRole[role].length > 0 ? (
                          employeesByRole[role].map((a) => (
                            <p key={a.id} className="text-sm text-gray-900">
                              {a.employee.fullName}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">
                            Chưa phân công
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Right panel – Payment table */}
            <div className="flex-1 pr-2 flex flex-col min-h-0 overflow-x-auto">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Thanh Toán
                  </p>
                </div>

                {/* Year selector */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                  <button
                    onClick={() => setSelectedYear((y) => y - 1)}
                    className="p-1 rounded hover:bg-gray-200 text-gray-600 focus:outline-none"
                    aria-label="Năm trước"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-sm font-semibold text-gray-800 w-12 text-center select-none">
                    {selectedYear}
                  </span>
                  <button
                    onClick={() => setSelectedYear((y) => y + 1)}
                    className="p-1 rounded hover:bg-gray-200 text-gray-600 focus:outline-none"
                    aria-label="Năm sau"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {/* 12-month table */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Tháng
                    </th>
                    <th className="px-4 py-1.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                      Đã Thanh Toán
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Số Tiền
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Thời Gian
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-64">
                      Ghi Chú
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const payment = getPayment(month);
                    return (
                      <MonthRow
                        key={month}
                        monthName={MONTH_NAMES[month - 1]}
                        month={month}
                        year={selectedYear}
                        isPaid={!!payment}
                        note={payment?.note ?? ""}
                        amount={payment?.amount ?? null}
                        collectionDate={payment?.collectionDate ?? null}
                        isLoading={loadingMonths.has(month)}
                        onToggle={() => handleToggle(month)}
                        onNoteBlur={(note: string) =>
                          handleNoteBlur(month, note)
                        }
                        onAmountBlur={(amount: string) =>
                          handleAmountBlur(month, amount)
                        }
                        onDateBlur={(day: string) =>
                          handleDateBlur(month, day)
                        }
                      />
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-800">Tổng Cộng</td>
                    <td className="px-4 py-2 text-center text-sm text-gray-600">
                      {paidCount}/12
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatCurrencyVND(
                        paymentsForYear.reduce((sum, p) => sum + (p.amount ?? 0), 0) || null
                      )}
                    </td>
                    <td colSpan={2} className="px-4 py-2 text-sm text-gray-600">
                      {paymentsForYear.filter((p) => p.collectionDate).length} tháng
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleteCompany.isPending}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm focus:outline-none inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 size={15} />
            {deleteCompany.isPending ? "Đang xoá..." : "Xoá"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm focus:outline-none"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailModal;
