export const formatCurrencyVND = (value: number): string => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value);
}