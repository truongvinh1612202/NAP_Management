import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  AlertCircle,
  X,
  Download,
  CalendarCheck2,
  FileSpreadsheet,
} from "lucide-react";
import { trpc } from "../utils/trpc";
import DatePickerVN from "@/components/DatePickerVN";
import MoneyInput from "@/components/MoneyInput";
import { toast } from "@/components/Toast";
import { formatCurrencyVND, dayKeyToNoonIso, normalizeVN } from "@/utils/helper";
import {
  parseBulkPaymentFile,
  exportBulkPaymentTemplate,
  parseKy,
  parseVNDateKey,
  parseMoneyCell,
} from "../utils/excelUtils";

interface ImportPaymentsModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function todayYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const periodLabel = (m: number, y: number) => `T${String(m).padStart(2, "0")}/${y}`;

interface ResultSummary {
  createdCount: number;
  skipped: { name: string; period: string }[];
  failedCount: number;
  periods: string[];
  batchId: number | null;
}

type EditField = "mst" | "ky" | "soTien" | "ghiChu";

// 1 dòng công ty có thể chỉnh (giá trị lưu dạng chuỗi để sửa trực tiếp).
interface EditRow {
  id: number; // = số dòng Excel, dùng làm key
  stt: string | number;
  tenCty: string; // tên trong file (chỉ tham khảo)
  mst: string;
  ky: string; // "MM/YYYY" hoặc "Q1/2026"
  soTien: string; // chuỗi chữ số thuần ("" = theo phí DV)
  ghiChu: string;
}

const ImportPaymentsModal = ({ onClose, onSuccess }: ImportPaymentsModalProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [hasFile, setHasFile] = useState(false);
  // Dòng CÓ THỂ SỬA (double-click từng ô). Sửa xong tự kiểm lại.
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [editing, setEditing] = useState<{ id: number; field: EditField } | null>(null);
  const [collectionDate, setCollectionDate] = useState(todayYYYYMMDD());
  const [enteredById, setEnteredById] = useState<number | "">("");
  const [nguoiNhapWarn, setNguoiNhapWarn] = useState("");
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ResultSummary | null>(null);

  const { data: companyList } = useQuery(trpc.companies.queryOptions());
  const { data: employeeList } = useQuery(trpc.employees.queryOptions());
  const bulkCreate = useMutation(trpc.bulkCreatePayments.mutationOptions());

  const companyByTaxId = useMemo(
    () => new Map((companyList ?? []).map((c) => [c.taxId.trim(), c])),
    [companyList],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setHasFile(false);
    setEditRows([]);
    setEditing(null);
    setNguoiNhapWarn("");
    try {
      const data = await parseBulkPaymentFile(file);
      setHasFile(true);
      // Chuyển các dòng thô thành dòng SỬA ĐƯỢC (Kỳ chuẩn hoá "MM/YYYY", tiền = chuỗi số).
      setEditRows(
        data.rows.map((r) => {
          const k = parseKy(r.kyRaw);
          const money = parseMoneyCell(r.soTienRaw);
          return {
            id: r.excelRow,
            stt: r.stt,
            tenCty: r.tenCty,
            mst: r.mst,
            ky: k
              ? `${String(k.month).padStart(2, "0")}/${k.year}`
              : String(r.kyRaw ?? ""),
            soTien: money != null ? String(money) : "",
            ghiChu: r.ghiChu,
          };
        }),
      );
      // Ngày: điền sẵn từ file (chỉnh được ở ô lịch để tránh lệch ngày do Excel).
      setCollectionDate(parseVNDateKey(data.ngayRaw) || todayYYYYMMDD());
      // Người nhập: khớp theo tên trong file (không dấu). Không khớp → cảnh báo, để trống.
      if (data.nguoiNhap) {
        const norm = normalizeVN(data.nguoiNhap);
        const match = (employeeList ?? []).find(
          (emp) => normalizeVN(emp.fullName) === norm,
        );
        if (match) {
          setEnteredById(match.id);
          setNguoiNhapWarn("");
        } else {
          setEnteredById("");
          setNguoiNhapWarn(
            `Tên người nhập "${data.nguoiNhap}" trong file không khớp nhân viên nào — vui lòng chọn lại.`,
          );
        }
      } else {
        setEnteredById("");
      }
    } catch (err) {
      setParseError(
        `Lỗi đọc file: ${err instanceof Error ? err.message : "Không đọc được"}`,
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Kiểm tra & dựng danh sách dòng từ editRows (sửa ô nào là kiểm lại ô đó ngay).
  // Dòng lỗi (MST lạ / Kỳ sai) bị BỎ QUA khi nhập nhưng vẫn hiện để người dùng sửa.
  const review = useMemo(() => {
    const items: {
      companyId: number;
      month: number;
      year: number;
      amount: number | null;
      note: string | null;
    }[] = [];
    const preview: {
      id: number;
      tenCty: string; // tên hiển thị (ưu tiên tên công ty khớp trong hệ thống)
      companyName: string | null;
      serviceFee: number | null;
      kyLabel: string;
      money: number | null;
      ok: boolean;
      err?: string;
      fileTenCty: string; // tên gốc trong file (để đối chiếu)
      nameDiffers: boolean; // tên file khác tên hệ thống (sẽ tự đổi theo hệ thống)
    }[] = [];
    let total = 0;
    for (const r of editRows) {
      const company = companyByTaxId.get(r.mst.trim());
      const ky = parseKy(r.ky);
      const money = parseMoneyCell(r.soTien);
      let ok = true;
      let err: string | undefined;
      if (!company) {
        ok = false;
        err = `MST "${r.mst}" không có trong hệ thống`;
      } else if (!ky) {
        ok = false;
        err = `Kỳ "${r.ky}" không hợp lệ (dùng MM/YYYY hoặc Q1/YYYY)`;
      }
      if (ok && company && ky) {
        items.push({
          companyId: company.id,
          month: ky.month,
          year: ky.year,
          amount: money,
          note: r.ghiChu || null,
        });
        total += money ?? company.serviceFee ?? 0;
      }
      // Tên hiển thị/lưu LUÔN theo hệ thống (khớp qua MST); tên trong file chỉ tham khảo.
      const nameDiffers =
        !!company &&
        !!r.tenCty.trim() &&
        normalizeVN(company.companyName) !== normalizeVN(r.tenCty);
      preview.push({
        id: r.id,
        tenCty: company?.companyName || r.tenCty || "—",
        companyName: company?.companyName ?? null,
        serviceFee: company?.serviceFee ?? null,
        kyLabel: ky ? periodLabel(ky.month, ky.year) : r.ky || "—",
        money,
        ok,
        err,
        fileTenCty: r.tenCty,
        nameDiffers,
      });
    }
    const errorRows = preview.filter((p) => !p.ok);
    return { items, preview, errorRows, total };
  }, [editRows, companyByTaxId]);

  const setField = (id: number, field: EditField, value: string) =>
    setEditRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  const previewById = useMemo(
    () => new Map(review.preview.map((p) => [p.id, p])),
    [review],
  );

  const canImport =
    review.items.length > 0 &&
    collectionDate.length === 10 &&
    !bulkCreate.isPending;

  const handleImport = async () => {
    const isoDate = dayKeyToNoonIso(collectionDate);
    if (!isoDate) {
      toast.error("Ngày thu không hợp lệ");
      return;
    }
    try {
      const res = await bulkCreate.mutateAsync({
        items: review.items,
        collectionDate: isoDate,
        note: null,
        enteredById: enteredById === "" ? null : enteredById,
      });
      const companyById = new Map((companyList ?? []).map((c) => [c.id, c]));
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
        toast.success(`Đã nhập ${res.createdCount} dòng vào phiếu #${res.batchId}`);
      } else {
        toast.error("Không tạo được dòng nào (có thể đã tồn tại).");
      }
      onSuccess?.();
    } catch (err) {
      console.error("importPayments error:", err);
      toast.error("Nhập phiếu thất bại. Vui lòng thử lại.");
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  // ── Kết quả ──────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CalendarCheck2 size={24} className="text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900">Hoàn thành!</h3>
            <p className="text-gray-500 text-sm mt-0.5">
              {result.periods.length > 0 && (
                <span className="font-semibold text-gray-800">
                  {result.periods.join(", ")}
                </span>
              )}
              {result.batchId != null && (
                <>
                  {result.periods.length > 0 && " · "}
                  <span className="font-semibold text-gray-800">
                    Phiếu #{result.batchId}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="w-full grid grid-cols-3 gap-2">
            {[
              { label: "Đã tạo", count: result.createdCount, cls: "text-green-600" },
              { label: "Bỏ qua", count: result.skipped.length, cls: "text-yellow-600" },
              { label: "Lỗi", count: result.failedCount, cls: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-gray-200 p-3 text-center">
                <p className={`text-2xl font-bold ${s.cls}`}>{s.count}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {result.skipped.length > 0 && (
            <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-yellow-800 mb-1">
                Bỏ qua (đã có dữ liệu):
              </p>
              <ul className="space-y-0.5">
                {result.skipped.map((s, i) => (
                  <li key={i} className="text-xs text-yellow-700">
                    • {s.name} · {s.period}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // ── Form nhập ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-h-[95vh] max-w-6xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} className="text-white" />
            </div>
            <h2 className="text-base font-extrabold text-gray-900">
              Nhập phiếu thu từ Excel
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportBulkPaymentTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 focus:outline-none"
              title="Tải file Excel mẫu để điền"
            >
              <Download size={16} /> Tải file mẫu
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* Chọn file — khung to khi CHƯA có file; sau khi nạp thu gọn 1 dòng để list rộng hơn */}
          {!hasFile ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={26} className="mx-auto text-gray-400 mb-1.5" />
              <p className="text-sm font-semibold text-gray-600">
                {fileName || "Nhấp để chọn file Excel đã điền"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                1 file = 1 phiếu (nhiều công ty). Chưa có file? Bấm "Tải file mẫu" ở trên.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
              <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
              <span className="font-semibold text-gray-700 truncate flex-1">{fileName}</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
              >
                Chọn file khác
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />

          {parseError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 font-semibold">{parseError}</p>
            </div>
          )}

          {hasFile && (
            <>
              {/* Ngày + Người nhập (cấp phiếu, chỉnh được) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                    Ngày thu <span className="text-red-500">*</span>
                  </label>
                  <DatePickerVN
                    value={collectionDate}
                    onChange={(v) => setCollectionDate(v)}
                    className="w-full"
                    inputClassName="w-full pr-2 py-1.5 focus:outline-none text-sm font-semibold text-gray-900 bg-transparent placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-0.5">
                    Người nhập
                  </label>
                  <select
                    value={enteredById}
                    onChange={(e) =>
                      setEnteredById(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white text-gray-900 hover:border-gray-400 cursor-pointer"
                  >
                    <option value="">— Chọn người nhập —</option>
                    {employeeList?.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName}
                      </option>
                    ))}
                  </select>
                  {nguoiNhapWarn && (
                    <p className="text-xs text-amber-600 mt-0.5 font-semibold">
                      ⚠ {nguoiNhapWarn}
                    </p>
                  )}
                </div>
              </div>

              {/* Bảng công ty — nhấp đúp vào ô MST / Kỳ / Số tiền / Ghi chú để SỬA */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-gray-800 text-sm">
                    Sẽ nhập {review.items.length}/{editRows.length} dòng (công ty × kỳ)
                    {review.errorRows.length > 0 && (
                      <span className="ml-2 text-xs font-semibold text-amber-600">
                        ({review.errorRows.length} dòng lỗi sẽ bị bỏ qua — nhấp đúp để sửa)
                      </span>
                    )}
                  </h4>
                  <span className="text-sm font-black text-green-600">
                    {formatCurrencyVND(review.total || null)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1.5">
                  💡 Nhấp đúp vào ô <b>MST</b>, <b>Kỳ</b>, <b>Số tiền</b> hay <b>Ghi chú</b> để sửa ngay.
                </p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-[68vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-100 border-b border-gray-200 z-10">
                        <tr>
                          <th className="px-3 py-2.5 text-center text-sm font-bold text-gray-700 w-10">
                            #
                          </th>
                          <th className="px-3 py-2.5 text-left text-sm font-bold text-gray-700">
                            Tên công ty
                          </th>
                          <th className="px-3 py-2.5 text-left text-sm font-bold text-gray-700">
                            MST
                          </th>
                          <th className="px-3 py-2.5 text-center text-sm font-bold text-gray-700">
                            Kỳ
                          </th>
                          <th className="px-3 py-2.5 text-right text-sm font-bold text-gray-700">
                            Số tiền
                          </th>
                          <th className="px-3 py-2.5 text-left text-sm font-bold text-gray-700">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editRows.map((row, idx) => {
                          const p = previewById.get(row.id);
                          const isErr = p ? !p.ok : false;
                          const editingCell = (f: EditField) =>
                            editing?.id === row.id && editing.field === f;
                          return (
                            <tr
                              key={row.id}
                              className={isErr ? "bg-red-50" : "hover:bg-gray-50"}
                              title={isErr ? p?.err : undefined}
                            >
                              <td className="px-3 py-2 text-center text-sm text-gray-400">
                                {isErr ? (
                                  <span title={p?.err} className="text-red-500 font-bold">
                                    !
                                  </span>
                                ) : (
                                  idx + 1
                                )}
                              </td>
                              {/* Tên công ty — LUÔN theo hệ thống (khớp qua MST). Nếu tên
                                  trong file khác → hiện ✎ (rê chuột thấy tên gốc trong file). */}
                              <td className="px-3 py-2 text-sm font-semibold text-gray-900 max-w-[360px]">
                                <div
                                  className="truncate flex items-center gap-1"
                                  title={
                                    p?.nameDiffers
                                      ? `Tên trong file: "${p.fileTenCty}" → sẽ lưu theo hệ thống: "${p.tenCty}"`
                                      : undefined
                                  }
                                >
                                  <span className="truncate">{p?.tenCty}</span>
                                  {p?.nameDiffers && (
                                    <span className="text-amber-500 shrink-0" title={`Tên trong file: "${p.fileTenCty}"`}>
                                      ✎
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* MST — sửa được */}
                              <td
                                className="px-3 py-2 text-sm text-gray-600 cursor-pointer"
                                onDoubleClick={() => setEditing({ id: row.id, field: "mst" })}
                              >
                                {editingCell("mst") ? (
                                  <input
                                    autoFocus
                                    inputMode="numeric"
                                    defaultValue={row.mst}
                                    onBlur={(e) => {
                                      setField(row.id, "mst", e.target.value.trim());
                                      setEditing(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.currentTarget.blur();
                                      if (e.key === "Escape") setEditing(null);
                                    }}
                                    className="w-full border border-emerald-400 rounded px-1.5 py-1 text-sm focus:outline-none"
                                  />
                                ) : (
                                  row.mst || <span className="text-gray-300">(trống)</span>
                                )}
                              </td>
                              {/* Kỳ — sửa được */}
                              <td
                                className="px-3 py-2 text-sm text-center cursor-pointer"
                                onDoubleClick={() => setEditing({ id: row.id, field: "ky" })}
                              >
                                {editingCell("ky") ? (
                                  <input
                                    autoFocus
                                    defaultValue={row.ky}
                                    placeholder="MM/YYYY"
                                    onBlur={(e) => {
                                      setField(row.id, "ky", e.target.value.trim());
                                      setEditing(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.currentTarget.blur();
                                      if (e.key === "Escape") setEditing(null);
                                    }}
                                    className="w-24 border border-emerald-400 rounded px-1.5 py-1 text-sm text-center focus:outline-none"
                                  />
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold ${
                                      p?.ok ? "bg-blue-50 text-blue-700" : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {p?.kyLabel}
                                  </span>
                                )}
                              </td>
                              {/* Số tiền — sửa được */}
                              <td
                                className="px-3 py-2 text-sm text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap cursor-pointer"
                                onDoubleClick={() =>
                                  setEditing({ id: row.id, field: "soTien" })
                                }
                              >
                                {editingCell("soTien") ? (
                                  <MoneyInput
                                    autoFocus
                                    value={row.soTien}
                                    onChange={(raw) => setField(row.id, "soTien", raw)}
                                    onBlur={() => setEditing(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.currentTarget.blur();
                                      if (e.key === "Escape") setEditing(null);
                                    }}
                                    className="w-28 border border-emerald-400 rounded px-1.5 py-1 text-sm text-right focus:outline-none"
                                  />
                                ) : p && p.money != null ? (
                                  formatCurrencyVND(p.money)
                                ) : (
                                  <span className="text-gray-500">
                                    {formatCurrencyVND(p?.serviceFee ?? null)}{" "}
                                    <span className="text-xs text-gray-400">(phí DV)</span>
                                  </span>
                                )}
                              </td>
                              {/* Ghi chú — sửa được */}
                              <td
                                className="px-3 py-2 text-sm text-gray-500 cursor-pointer truncate max-w-[200px]"
                                onDoubleClick={() =>
                                  setEditing({ id: row.id, field: "ghiChu" })
                                }
                              >
                                {editingCell("ghiChu") ? (
                                  <input
                                    autoFocus
                                    defaultValue={row.ghiChu}
                                    onBlur={(e) => {
                                      setField(row.id, "ghiChu", e.target.value);
                                      setEditing(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.currentTarget.blur();
                                      if (e.key === "Escape") setEditing(null);
                                    }}
                                    className="w-full border border-emerald-400 rounded px-1.5 py-1 text-sm focus:outline-none"
                                  />
                                ) : (
                                  row.ghiChu || <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0 bg-gray-50/80">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 border border-gray-300 rounded-lg hover:bg-white"
          >
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={!canImport}
            id="btn-import-payments-submit"
            className="px-6 py-2.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-black focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {bulkCreate.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang nhập...
              </>
            ) : (
              <>
                <CalendarCheck2 size={18} />
                Nhập phiếu{review.items.length > 0 ? ` (${review.items.length})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportPaymentsModal;
