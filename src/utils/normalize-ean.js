export function normalizeEan(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  return digits;
}
