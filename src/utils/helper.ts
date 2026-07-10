export const formatCurrencyVND = (value: number | null): string => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

// ─── Nhập số tiền: nhóm 3 chữ số bằng dấu "." (chuẩn Việt) ────────────────────
// Nhận chuỗi bất kỳ, giữ lại CHỮ SỐ, bỏ số 0 vô nghĩa ở đầu, rồi chèn "." mỗi 3
// chữ số từ phải sang. Ví dụ: "4000000" → "4.000.000", "" → "". Dùng cho ô nhập
// tiền (hiển thị có dấu chấm cho dễ đọc, state vẫn lưu chuỗi chữ số thuần).
export const groupDigits = (raw: string): string => {
  const digits = String(raw).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Chỉ giữ chữ số (bỏ dấu chấm, khoảng trắng…) — nghịch đảo của groupDigits.
export const onlyDigits = (raw: string): string =>
  String(raw).replace(/\D/g, "").replace(/^0+(?=\d)/, "");

// ─── Chuẩn hoá chuỗi để tìm kiếm KHÔNG DẤU ────────────────────────────────────
// "Công Ty Đông" → "cong ty dong". Cho phép gõ không dấu vẫn khớp tên có dấu.
export const normalizeVN = (s: string): string =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

// ─── Ngày thu (collection date) — chuẩn hoá chống lệch múi giờ ─────────────────
// Ngày thu là 1 NGÀY LỊCH (không có giờ). Ta luôn lưu ở mốc 12:00 UTC (giữa trưa).
// Lý do: 12:00 UTC ± bất kỳ offset thực tế nào (UTC-11..UTC+11) vẫn rơi vào ĐÚNG
// ngày đó khi đọc bằng giờ địa phương → hiển thị/lọc theo ngày giống nhau trên
// MỌI máy, không phụ thuộc múi giờ máy cài đặt. (Trước đây có chỗ lưu nửa đêm địa
// phương, có chỗ lưu nửa đêm UTC → lệch 1 ngày trên máy khác múi giờ.)

// Hiển thị ngày theo CHUẨN VIỆT: luôn "dd/mm/yyyy" (có số 0 đứng đầu), trên mọi
// máy — không phụ thuộc locale của hệ điều hành (tránh toLocaleDateString đôi khi
// ra "4/2/2026" hoặc rơi về định dạng máy). Dùng giờ địa phương để khớp với cách
// lưu ngày thu ở mốc 12:00 UTC (đọc ra đúng ngày trên mọi múi giờ).
export const formatDateVN = (
  value: Date | string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  return `${dd}/${mm}/${yyyy}`;
};

// "yyyy-mm-dd" → ISO ở mốc 12:00 UTC. Trả null nếu key rỗng/không hợp lệ.
export const dayKeyToNoonIso = (key: string): string | null => {
  if (!key) return null;
  const [y, m, d] = key.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
};

// Một Date bất kỳ → ISO ở mốc 12:00 UTC của ĐÚNG ngày lịch (theo giờ địa phương của Date đó).
// Dùng khi nguồn là Date từ ô nhập lịch (giá trị theo giờ địa phương).
export const localDateToNoonIso = (date: Date): string =>
  new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0),
  ).toISOString();
