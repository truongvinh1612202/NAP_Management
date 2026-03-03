import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "../utils/trpc";
import { formatCurrencyVND } from "@/utils/helper";

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

// ─── MonthRow ─────────────────────────────────────────────────────────────────

interface MonthRowProps {
  monthName: string;
  isPaid: boolean;
  note: string;
  isLoading: boolean;
  onToggle: () => void;
  onNoteBlur: (note: string) => void;
}

const MonthRow = ({
  monthName,
  isPaid,
  note,
  isLoading,
  onToggle,
  onNoteBlur,
}: MonthRowProps) => {
  const [localNote, setLocalNote] = useState(note);

  // Sync note when external data changes (year switch, refetch, etc.)
  useEffect(() => {
    setLocalNote(note);
  }, [note]);

  return (
    <tr className={isPaid ? "bg-green-50" : "bg-white"}>
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
        <input
          type="text"
          value={isPaid ? localNote : ""}
          onChange={(e) => setLocalNote(e.target.value)}
          onBlur={() => onNoteBlur(localNote)}
          placeholder={isPaid ? "Ghi chú..." : "—"}
          disabled={!isPaid}
          className={`w-full border-solid box-border text-sm border rounded px-2 py-1 focus:outline-none ${
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
}

const CompanyDetailModal = ({
  companyId,
  onClose,
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

  const handleToggle = async (month: number) => {
    setLoadingMonths((prev) => new Set(prev).add(month));
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
        });
      }
      await refetch();
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
    await updatePayment.mutateAsync({
      id: payment.id,
      data: { note: trimmed || null },
    });
    await refetch();
  };

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
        className="bg-white rounded-xl shadow-xl w-[960px] max-h-[90vh] flex flex-col"
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
            <div className="flex-1 p-6 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Thanh Toán
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Đã thanh toán: {paidCount}/12 tháng
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
                        isPaid={!!payment}
                        note={payment?.note ?? ""}
                        isLoading={loadingMonths.has(month)}
                        onToggle={() => handleToggle(month)}
                        onNoteBlur={(note: string) =>
                          handleNoteBlur(month, note)
                        }
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end shrink-0">
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
